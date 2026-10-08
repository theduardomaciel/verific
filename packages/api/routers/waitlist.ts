import { TRPCError } from "@trpc/server";

import { db } from "@verific/drizzle";
import { and, eq, inArray } from "@verific/drizzle/orm";
import {
	activity,
	activityWaitlist,
	participant,
	project,
} from "@verific/drizzle/schema";
import { z } from "@verific/zod";

import {
	assertNoScheduleConflict,
	lockParticipant,
	persistEnrollment,
	prepareActivityAnswers,
	saveActivityAnswers,
} from "../enrollment";
import { answerValueSchema, type WaitlistErrorCode } from "../schemas";
import { assertSeatsAvailable, checkSeats, lockActivity } from "../seats";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
	addToWaitlist,
	closeEntry,
	getActiveEntries,
	getActivityRange,
	queuePositions,
	resolveEnrolledEntries,
	settleActivity,
	type ActiveEntry,
} from "../waitlist";

function waitlistError(code: WaitlistErrorCode, message: string) {
	return new TRPCError({ code: "BAD_REQUEST", message, cause: { code } });
}

async function findActivity(activityId: string) {
	const found = await db.query.activity.findFirst({
		where: eq(activity.id, activityId),
		columns: {
			id: true,
			projectId: true,
			isRegistrationOpen: true,
			participantsLimit: true,
		},
	});
	if (!found) {
		throw new TRPCError({
			message: "Atividade não encontrada.",
			code: "NOT_FOUND",
		});
	}
	return found;
}

/** Participante do usuário no evento da atividade. */
async function findRequester(projectId: string, userId: string) {
	const found = await db.query.participant.findFirst({
		where: and(
			eq(participant.projectId, projectId),
			eq(participant.userId, userId),
		),
		columns: { id: true },
	});
	if (!found) {
		throw new TRPCError({
			message: "Você não está inscrito neste evento.",
			code: "FORBIDDEN",
		});
	}
	return found.id;
}

/** Estado de uma pessoa na fila, como o cliente o mostra. */
function describeEntry(queue: ActiveEntry[], participantId: string) {
	const entry = queue.find((e) => e.participantId === participantId);
	if (!entry) return null;
	return {
		status: entry.status,
		position: queuePositions(queue).get(participantId) ?? null,
		joinedAt: entry.joinedAt,
		offerExpiresAt: entry.offerExpiresAt,
	};
}

export const waitlistRouter = createTRPCRouter({
	/**
	 * Entra na fila da atividade lotada. Se houver vaga e ninguém
	 * esperando, inscreve direto. As respostas do formulário ficam salvas
	 * para a promoção não depender de mais nada da pessoa.
	 */
	joinActivityWaitlist: protectedProcedure
		.input(
			z.object({
				activityId: z.uuid(),
				formAnswers: z
					.object({
						answers: z.record(z.string(), answerValueSchema),
					})
					.optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { activityId, formAnswers } = input;

			const found = await findActivity(activityId);
			if (!found.isRegistrationOpen) {
				throw new TRPCError({
					message: "Activity registration is closed.",
					code: "BAD_REQUEST",
					cause: { code: "REGISTRATION_CLOSED" },
				});
			}
			if (found.participantsLimit == null) {
				throw waitlistError(
					"NO_WAITLIST",
					"Esta atividade não tem limite de vagas.",
				);
			}

			const participantId = await findRequester(
				found.projectId,
				ctx.session.user.id,
			);
			const answerRows = await prepareActivityAnswers({
				projectId: found.projectId,
				activityId,
				participantIds: [participantId],
				formAnswers,
				subscribesSelf: true,
			});

			return db.transaction(async (tx) => {
				await lockParticipant(tx, participantId);
				await assertNoScheduleConflict(tx, activityId, participantId);

				const locked = await lockActivity(tx, activityId);
				const { endsAt } = await getActivityRange(tx, activityId);
				if (endsAt && endsAt <= new Date()) {
					throw waitlistError(
						"ACTIVITY_ENDED",
						"Esta atividade já terminou.",
					);
				}

				const queue = await settleActivity(tx, locked);
				const current = describeEntry(queue, participantId);
				if (current) return current;

				const seats = await checkSeats(
					tx,
					locked,
					queue,
					[participantId],
					{
						queueFirst: true,
					},
				);
				if (seats.ok) {
					await persistEnrollment(tx, {
						activityId,
						participantIds: [participantId],
						answerRows,
					});
					return { status: "enrolled" as const };
				}

				await addToWaitlist(tx, activityId, participantId);
				await saveActivityAnswers(tx, answerRows);

				const entries = await getActiveEntries(tx, activityId);
				return describeEntry(entries, participantId)!;
			});
		}),

	/** Sai da fila; vale também para recusar uma vaga oferecida. */
	leaveActivityWaitlist: protectedProcedure
		.input(z.object({ activityId: z.uuid() }))
		.mutation(async ({ input, ctx }) => {
			const { activityId } = input;

			const found = await findActivity(activityId);
			const participantId = await findRequester(
				found.projectId,
				ctx.session.user.id,
			);

			await db.transaction(async (tx) => {
				const locked = await lockActivity(tx, activityId);
				const closed = await closeEntry(tx, activityId, participantId, {
					type: "left",
					actorUserId: ctx.session.user.id,
				});
				if (!closed) {
					throw waitlistError(
						"NOT_IN_WAITLIST",
						"Você não está na fila desta atividade.",
					);
				}
				await settleActivity(tx, locked);
			});

			return { success: true };
		}),

	/** Confirma a vaga oferecida pela fila, se a oferta ainda vale. */
	confirmWaitlistOffer: protectedProcedure
		.input(z.object({ activityId: z.uuid() }))
		.mutation(async ({ input, ctx }) => {
			const { activityId } = input;

			const found = await findActivity(activityId);
			const participantId = await findRequester(
				found.projectId,
				ctx.session.user.id,
			);

			await db.transaction(async (tx) => {
				await lockParticipant(tx, participantId);
				await assertNoScheduleConflict(tx, activityId, participantId);

				const locked = await lockActivity(tx, activityId);
				const queue = await settleActivity(tx, locked);
				const entry = queue.find(
					(e) => e.participantId === participantId,
				);
				if (entry?.status !== "offered") {
					throw waitlistError(
						"OFFER_EXPIRED",
						"Não há vaga oferecida a você nesta atividade.",
					);
				}

				const queued = await assertSeatsAvailable(tx, locked, queue, [
					participantId,
				]);
				// As respostas foram salvas ao entrar na fila
				await persistEnrollment(tx, {
					activityId,
					participantIds: [participantId],
					answerRows: [],
				});
				await resolveEnrolledEntries(tx, activityId, queued, {
					type: "confirmed",
					actorUserId: ctx.session.user.id,
				});
			});

			return { success: true };
		}),

	/** Filas em que o usuário está no evento, com posição e prazo. */
	getMyWaitlistEntries: protectedProcedure
		.input(z.object({ projectUrl: z.string() }))
		.query(async ({ input, ctx }) => {
			const found = await db.query.project.findFirst({
				where: eq(project.url, input.projectUrl),
				columns: { id: true },
			});
			if (!found) return [];

			const me = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, found.id),
					eq(participant.userId, ctx.session.user.id),
				),
				columns: { id: true },
			});
			if (!me) return [];

			const active = await db
				.selectDistinct({ activityId: activityWaitlist.activityId })
				.from(activityWaitlist)
				.where(
					and(
						eq(activityWaitlist.participantId, me.id),
						inArray(activityWaitlist.status, [
							"waiting",
							"offered",
						]),
					),
				);
			if (active.length === 0) return [];

			// Acerta cada fila antes de ler, em ordem de id para não travar
			return db.transaction(async (tx) => {
				const entries = [];
				for (const { activityId } of active.sort((a, b) =>
					a.activityId.localeCompare(b.activityId),
				)) {
					const locked = await lockActivity(tx, activityId);
					const queue = await settleActivity(tx, locked);
					const entry = describeEntry(queue, me.id);
					if (entry) entries.push({ activityId, ...entry });
				}
				return entries;
			});
		}),
});
