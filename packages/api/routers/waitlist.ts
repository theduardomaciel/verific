import { TRPCError } from "@trpc/server";

import { db } from "@verific/drizzle";
import { and, desc, eq, inArray } from "@verific/drizzle/orm";
import {
	activity,
	activityWaitlist,
	activityWaitlistEvent,
	participant,
	project,
	projectModerator,
	user,
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
import {
	assertSeatsAvailable,
	checkSeats,
	countEnrolled,
	lockActivity,
} from "../seats";
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
import { byQueueOrder } from "../waitlist-plan";

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

/** Só o dono do evento ou um moderador opera a fila da atividade. */
async function assertCanManageActivity(activityId: string, userId: string) {
	const found = await db.query.activity.findFirst({
		where: eq(activity.id, activityId),
		columns: { id: true },
		with: {
			project: {
				columns: { ownerId: true },
				with: {
					moderators: {
						where: eq(projectModerator.userId, userId),
						columns: { userId: true },
					},
				},
			},
		},
	});
	if (!found) {
		throw new TRPCError({
			message: "Atividade não encontrada.",
			code: "NOT_FOUND",
		});
	}
	const { ownerId, moderators } = found.project;
	if (ownerId !== userId && moderators.length === 0) {
		throw new TRPCError({
			message: "Você não pode gerenciar a fila desta atividade.",
			code: "FORBIDDEN",
		});
	}
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
	/**
	 * Fila da atividade para a organização: vagas livres, quem espera e
	 * quem tem oferta, na ordem da fila.
	 */
	getActivityWaitlist: protectedProcedure
		.input(z.object({ activityId: z.uuid() }))
		.query(async ({ input, ctx }) => {
			const { activityId } = input;
			await assertCanManageActivity(activityId, ctx.session.user.id);

			const { locked, queue, enrolled } = await db.transaction(
				async (tx) => {
					const locked = await lockActivity(tx, activityId);
					const queue = await settleActivity(tx, locked);
					return {
						locked,
						queue,
						enrolled: await countEnrolled(tx, activityId),
					};
				},
			);

			const people = queue.length
				? await db
						.select({
							participantId: participant.id,
							name: user.name,
							email: user.email,
							imageUrl: user.image_url,
						})
						.from(participant)
						.innerJoin(user, eq(user.id, participant.userId))
						.where(
							inArray(
								participant.id,
								queue.map((entry) => entry.participantId),
							),
						)
				: [];
			const personOf = new Map(people.map((p) => [p.participantId, p]));
			const positions = queuePositions(queue);
			const offers = queue.filter((e) => e.status === "offered").length;

			return {
				participantsLimit: locked.participantsLimit,
				enrolled,
				freeSeats:
					locked.participantsLimit == null
						? null
						: Math.max(
								0,
								locked.participantsLimit - enrolled - offers,
							),
				entries: [...queue].sort(byQueueOrder).map((entry) => ({
					...personOf.get(entry.participantId),
					participantId: entry.participantId,
					status: entry.status,
					position: positions.get(entry.participantId) ?? null,
					joinedAt: entry.joinedAt,
					offerExpiresAt: entry.offerExpiresAt,
				})),
			};
		}),

	/** Movimentações da fila, mais recentes primeiro. */
	getActivityWaitlistHistory: protectedProcedure
		.input(z.object({ activityId: z.uuid() }))
		.query(async ({ input, ctx }) => {
			await assertCanManageActivity(
				input.activityId,
				ctx.session.user.id,
			);

			const rows = await db.query.activityWaitlistEvent.findMany({
				where: eq(activityWaitlistEvent.activityId, input.activityId),
				orderBy: desc(activityWaitlistEvent.createdAt),
				limit: 500,
				columns: {
					id: true,
					type: true,
					createdAt: true,
					participantId: true,
				},
				with: {
					participant: {
						with: { user: { columns: { name: true } } },
					},
					actor: { columns: { name: true } },
				},
			});
			return rows.map(({ participant: p, actor, ...event }) => ({
				...event,
				participantName: p.user.name,
				actorName: actor?.name ?? null,
			}));
		}),

	/**
	 * Inscreve na hora quem está na fila, fora da ordem se preciso, desde
	 * que haja vagas livres. Quem tem conflito de horário é recusado.
	 */
	promoteFromWaitlist: protectedProcedure
		.input(
			z.object({
				activityId: z.uuid(),
				participantIds: z.array(z.uuid()).min(1),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { activityId } = input;
			const participantIds = [...new Set(input.participantIds)].sort();
			await assertCanManageActivity(activityId, ctx.session.user.id);

			await db.transaction(async (tx) => {
				for (const participantId of participantIds) {
					await lockParticipant(tx, participantId);
				}
				for (const participantId of participantIds) {
					await assertNoScheduleConflict(
						tx,
						activityId,
						participantId,
					);
				}

				const locked = await lockActivity(tx, activityId);
				const queue = await settleActivity(tx, locked);
				const missing = participantIds.filter(
					(id) => !queue.some((entry) => entry.participantId === id),
				);
				if (missing.length > 0) {
					throw waitlistError(
						"NOT_IN_WAITLIST",
						"Alguém selecionado não está mais na fila.",
					);
				}

				const queued = await assertSeatsAvailable(
					tx,
					locked,
					queue,
					participantIds,
				);
				// As respostas foram salvas ao entrar na fila
				await persistEnrollment(tx, {
					activityId,
					participantIds,
					answerRows: [],
				});
				await resolveEnrolledEntries(tx, activityId, queued, {
					type: "promoted",
					actorUserId: ctx.session.user.id,
				});
			});

			return { success: true };
		}),

	/** Tira alguém da fila; a vaga oferecida, se houver, vai ao próximo. */
	removeFromWaitlist: protectedProcedure
		.input(
			z.object({
				activityId: z.uuid(),
				participantId: z.uuid(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { activityId, participantId } = input;
			await assertCanManageActivity(activityId, ctx.session.user.id);

			await db.transaction(async (tx) => {
				const locked = await lockActivity(tx, activityId);
				const closed = await closeEntry(tx, activityId, participantId, {
					type: "removed",
					actorUserId: ctx.session.user.id,
				});
				if (!closed) {
					throw waitlistError(
						"NOT_IN_WAITLIST",
						"Esta pessoa não está na fila.",
					);
				}
				await settleActivity(tx, locked);
			});

			return { success: true };
		}),
});
