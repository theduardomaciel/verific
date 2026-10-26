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
import {
	loadNotificationRecipients,
	notifyActivityEnrollmentConfirmed,
	notifyActivityWaitlisted,
	notifyActivityWaitlistPromoted,
	notifyActivityWaitlistRemoved,
} from "../notifications";
import { answerValueSchema, type WaitlistErrorCode } from "../schemas";
import {
	assertActivityOpen,
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
	getEffectiveEntries,
	queuePositions,
	resolveEnrolledEntries,
	settleActivity,
	type ActiveEntry,
	type EffectiveEntry,
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
			waitlistEnabled: true,
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
function describeEntry(
	queue: (ActiveEntry | EffectiveEntry)[],
	participantId: string,
) {
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

			const result = await db.transaction(async (tx) => {
				await lockParticipant(tx, participantId);
				await assertNoScheduleConflict(tx, activityId, participantId);

				const locked = await lockActivity(tx, activityId);
				assertActivityOpen(locked);
				const { endsAt } = await getActivityRange(tx, activityId);
				if (endsAt && endsAt <= new Date()) {
					throw waitlistError(
						"ACTIVITY_ENDED",
						"Esta atividade já terminou.",
					);
				}

				const queue = await settleActivity(tx, locked);
				const current = describeEntry(queue, participantId);
				if (current)
					return { kind: "existing" as const, entry: current };

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
					const enrolled = await persistEnrollment(tx, {
						projectId: locked.projectId,
						activityId,
						participantIds: [participantId],
						answerRows,
					});
					return { kind: "enrolled" as const, enrolled };
				}

				// Desligar a fila bloqueia novas entradas, sem apagar as
				// existentes: quem já espera ou tem oferta continua valendo.
				if (locked.waitlistEnabled === false) {
					throw waitlistError(
						"WAITLIST_DISABLED",
						"A fila de espera desta atividade está desativada.",
					);
				}

				const waitlistEntry = await addToWaitlist(
					tx,
					activityId,
					participantId,
				);
				await saveActivityAnswers(tx, answerRows);

				const entries = await getActiveEntries(tx, activityId);
				const described = describeEntry(entries, participantId)!;
				return {
					kind: "waitlisted" as const,
					enrollmentId: waitlistEntry.id,
					position: described.position ?? undefined,
					entry: described,
				};
			});

			// Depois do commit: nada aqui pode reverter a inscrição/fila.
			if (result.kind === "enrolled") {
				const contacts = await loadNotificationRecipients([
					participantId,
				]);
				void notifyActivityEnrollmentConfirmed({
					eventId: found.projectId,
					activityId,
					contacts,
					enrolled: result.enrolled,
				});
				return { status: "enrolled" as const };
			}
			if (result.kind === "waitlisted") {
				const contacts = await loadNotificationRecipients([
					participantId,
				]);
				const to = contacts.get(participantId);
				if (to) {
					void notifyActivityWaitlisted({
						eventId: found.projectId,
						activityId,
						participantId,
						to,
						enrollmentId: result.enrollmentId,
						...(result.position
							? { position: result.position }
							: {}),
					});
				}
			}
			return result.entry;
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

			const promoted = await db.transaction(async (tx) => {
				await lockParticipant(tx, participantId);
				await assertNoScheduleConflict(tx, activityId, participantId);

				const locked = await lockActivity(tx, activityId);
				assertActivityOpen(locked);
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
					projectId: locked.projectId,
					activityId,
					participantIds: [participantId],
					answerRows: [],
				});
				return resolveEnrolledEntries(tx, activityId, queued, {
					type: "confirmed",
					actorUserId: ctx.session.user.id,
				});
			});

			const contacts = await loadNotificationRecipients(
				promoted.map((entry) => entry.participantId),
			);
			void notifyActivityWaitlistPromoted({
				eventId: found.projectId,
				activityId,
				contacts,
				resolved: promoted,
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

			// Read effective state without settling (no side effects, no e-mails).
			// Expired offers are computed from offerExpiresAt vs. now.
			return db.transaction(async (tx) => {
				const entries = [];
				for (const { activityId } of active.sort((a, b) =>
					a.activityId.localeCompare(b.activityId),
				)) {
					const queue = await getEffectiveEntries(tx, activityId);
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
					const queue = await getEffectiveEntries(tx, activityId);
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
					reason: true,
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
				reason: z.string().trim().max(500).optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { activityId, reason } = input;
			const participantIds = [...new Set(input.participantIds)].sort();
			await assertCanManageActivity(activityId, ctx.session.user.id);
			const found = await findActivity(activityId);

			const promoted = await db.transaction(async (tx) => {
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
				assertActivityOpen(locked);
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
					projectId: locked.projectId,
					activityId,
					participantIds,
					answerRows: [],
				});
				return resolveEnrolledEntries(tx, activityId, queued, {
					type: "promoted",
					actorUserId: ctx.session.user.id,
					reason,
				});
			});

			const contacts = await loadNotificationRecipients(
				promoted.map((entry) => entry.participantId),
			);
			void notifyActivityWaitlistPromoted({
				eventId: found.projectId,
				activityId,
				contacts,
				resolved: promoted,
			});

			return { success: true };
		}),

	removeFromWaitlist: protectedProcedure
		.input(
			z.object({
				activityId: z.uuid(),
				participantId: z.uuid(),
				reason: z.string().trim().max(500).optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { activityId, participantId, reason } = input;
			await assertCanManageActivity(activityId, ctx.session.user.id);
			const found = await findActivity(activityId);

			await db.transaction(async (tx) => {
				const locked = await lockActivity(tx, activityId);
				const closed = await closeEntry(tx, activityId, participantId, {
					type: "removed",
					actorUserId: ctx.session.user.id,
					reason,
				});
				if (!closed) {
					throw waitlistError(
						"NOT_IN_WAITLIST",
						"Esta pessoa não está na fila.",
					);
				}
				await settleActivity(tx, locked);
			});

			const contacts = await loadNotificationRecipients([participantId]);
			const to = contacts.get(participantId);
			if (to) {
				void notifyActivityWaitlistRemoved({
					eventId: found.projectId,
					activityId,
					participantId,
					to,
					removedAt: new Date(),
				});
			}

			return { success: true };
		}),

	/**
	 * Processa manualmente a fila da atividade: expira ofertas vencidas e
	 * oferece as vagas livres ao próximo da fila. Útil quando o agendador
	 * (QStash/sweep) não disparou a tempo.
	 */
	settleActivityWaitlist: protectedProcedure
		.input(z.object({ activityId: z.uuid() }))
		.mutation(async ({ input, ctx }) => {
			await assertCanManageActivity(
				input.activityId,
				ctx.session.user.id,
			);
			await db.transaction(async (tx) => {
				const locked = await lockActivity(tx, input.activityId);
				await settleActivity(tx, locked);
			});
			return { success: true };
		}),
});
