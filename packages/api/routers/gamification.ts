import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";

import { db } from "@verific/drizzle";
import {
	eventDayCount,
	eventDayKey,
	gamificationConfigSchema,
	parseGamificationConfig,
	stickerByKey,
} from "@verific/drizzle/gamification";
import { and, count, eq } from "@verific/drizzle/orm";
import {
	participant,
	participantCheckin,
	project,
} from "@verific/drizzle/schema";
import { z } from "@verific/zod";

import { parseCheckInCode } from "../lib/checkin-code";
import {
	awardPoints,
	checkInAtReception,
	evaluateStickers,
	getPointsTotal,
	grantSticker,
	loadGamificationSnapshot,
	loadRanking,
	pointKeys,
	projectConfig,
	type GamificationProject,
} from "../lib/gamification";
import { requireProjectAccess } from "../lib/project-access";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

/**
 * Gamificação do evento.
 *
 * Leitura pública (ranking/perfil) é sempre escopada por `projectUrl` e
 * exige perfis ativos; escrita exige dono/moderador (exceto o opt-out do
 * próprio participante). Nenhum ponto invalida cache ISR: ranking e
 * perfil leem os agregados ao vivo.
 */

function publicProject(projectUrl: string) {
	return db.query.project.findFirst({
		where: eq(project.url, projectUrl),
		columns: {
			id: true,
			ownerId: true,
			startDate: true,
			endDate: true,
			gamification: true,
			profilesEnabled: true,
		},
		with: {
			moderators: { columns: { userId: true } },
		},
	});
}

function requireEnabledProject(row: Awaited<ReturnType<typeof publicProject>>) {
	if (!row?.profilesEnabled) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Evento não encontrado.",
		});
	}
	const config = parseGamificationConfig(row.gamification);
	if (!config.enabled) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Gamificação desativada neste evento.",
		});
	}
	return config;
}

function toGamificationProject(
	row: NonNullable<Awaited<ReturnType<typeof publicProject>>>,
): GamificationProject {
	return {
		id: row.id,
		ownerId: row.ownerId,
		startDate: row.startDate,
		endDate: row.endDate,
		gamification: row.gamification,
		profilesEnabled: row.profilesEnabled ?? false,
		moderators: row.moderators,
	};
}

export const gamificationRouter = createTRPCRouter({
	/** Top do ranking público (respeita opt-out e exclusão de staff). */
	getEventRanking: publicProcedure
		.input(
			z.object({
				projectUrl: z.string().min(1),
				limit: z.number().int().min(1).max(100).optional(),
			}),
		)
		.query(async ({ input }) => {
			const row = await publicProject(input.projectUrl);
			const config = requireEnabledProject(row);
			if (!config.rankingEnabled) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Ranking desativado neste evento.",
				});
			}

			const limit = Math.min(
				input.limit ?? config.ranking.top,
				config.ranking.top,
			);
			const ranking = await loadRanking(
				db,
				toGamificationProject(row!),
				limit,
			);

			return {
				...ranking,
				top: config.ranking.top,
				allowOptOut: config.ranking.allowOptOut,
			};
		}),

	/** Pontos, posição e progresso dos adesivos de um perfil. */
	getParticipantGamification: publicProcedure
		.input(
			z.object({
				projectUrl: z.string().min(1),
				shortId: z.string().min(1),
			}),
		)
		.query(async ({ input }) => {
			const row = await publicProject(input.projectUrl);
			const config = requireEnabledProject(row);
			const participantRow = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, row!.id),
					eq(participant.shortId, input.shortId),
				),
				columns: { id: true, rankingOptOut: true },
			});
			if (!participantRow) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Perfil não encontrado.",
				});
			}

			const snapshot = await loadGamificationSnapshot(
				db,
				toGamificationProject(row!),
				participantRow.id,
			);

			return {
				...snapshot,
				rank: config.rankingEnabled ? snapshot.rank : null,
				rankingEnabled: config.rankingEnabled,
				stickersEnabled: config.stickersEnabled,
				allowOptOut: config.ranking.allowOptOut,
			};
		}),

	/** Posição do próprio participante (linha fixa do ranking). */
	getMyStanding: protectedProcedure
		.input(z.object({ projectUrl: z.string().min(1) }))
		.query(async ({ input, ctx }) => {
			const row = await publicProject(input.projectUrl);
			const config = requireEnabledProject(row);
			const participantRow = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, row!.id),
					eq(participant.userId, ctx.session.user.id),
				),
				columns: { id: true, shortId: true },
			});
			if (!participantRow) return null;

			const snapshot = await loadGamificationSnapshot(
				db,
				toGamificationProject(row!),
				participantRow.id,
			);
			return {
				shortId: participantRow.shortId,
				points: snapshot.points,
				rank: config.rankingEnabled ? snapshot.rank : null,
				optOut: snapshot.optOut,
				totalParticipants: snapshot.totalParticipants,
				rankingEnabled: config.rankingEnabled,
			};
		}),

	/** Configuração atual (dashboard). */
	getGamificationSettings: protectedProcedure
		.input(z.object({ projectId: z.string().uuid() }))
		.query(async ({ input, ctx }) => {
			const row = await requireProjectAccess(
				input.projectId,
				ctx.session.user.id,
			);
			return {
				config: parseGamificationConfig(row.gamification),
				eventDays: eventDayCount(row.startDate, row.endDate),
				profilesEnabled: Boolean(row.profilesEnabled),
				eventName: row.name,
			};
		}),

	/** Salva a configuração (dono/moderador). */
	updateGamificationSettings: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
				config: gamificationConfigSchema,
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const row = await requireProjectAccess(
				input.projectId,
				ctx.session.user.id,
			);
			if (input.config.enabled && !row.profilesEnabled) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Ative os perfis do evento antes de ligar a gamificação.",
				});
			}

			await db
				.update(project)
				.set({ gamification: input.config })
				.where(eq(project.id, input.projectId));

			return { config: input.config };
		}),

	/** Check-in de recepção do dia (staff escaneia o QR do perfil). */
	checkInParticipant: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
				code: z.string().trim().min(1).max(2048),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const projectRow = await requireProjectAccess(
				input.projectId,
				ctx.session.user.id,
			);
			const config = projectConfig(projectRow);
			if (!config.enabled) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Gamificação desativada neste evento.",
				});
			}

			let parsed: ReturnType<typeof parseCheckInCode>;
			try {
				parsed = parseCheckInCode(input.code);
			} catch {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "QR inválido para check-in.",
				});
			}

			const participantRow = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, input.projectId),
					eq(participant.shortId, parsed.shortId),
				),
				columns: { id: true },
				with: { user: { columns: { name: true } } },
			});
			if (!participantRow) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Participante não encontrado neste evento.",
				});
			}

			try {
				const result = await db.transaction((tx) =>
					checkInAtReception(tx, {
						project: projectRow,
						participantId: participantRow.id,
						actorUserId: ctx.session.user.id,
					}),
				);
				return {
					...result,
					participantId: participantRow.id,
					name: participantRow.user.name,
				};
			} catch (error) {
				const message =
					error instanceof Error ? error.message : String(error);
				if (message === "OUTSIDE_EVENT") {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							"Hoje não é um dia do evento; check-in indisponível.",
					});
				}
				if (message === "GAMIFICATION_DISABLED") {
					throw new TRPCError({
						code: "PRECONDITION_FAILED",
						message: "Gamificação desativada neste evento.",
					});
				}
				throw error;
			}
		}),

	/** Contadores da recepção para o dashboard. */
	getReceptionSummary: protectedProcedure
		.input(z.object({ projectId: z.string().uuid() }))
		.query(async ({ input, ctx }) => {
			const row = await requireProjectAccess(
				input.projectId,
				ctx.session.user.id,
			);
			const config = parseGamificationConfig(row.gamification);
			const day = eventDayKey(new Date());

			const [today, total] = await Promise.all([
				db
					.select({ amount: count() })
					.from(participantCheckin)
					.where(
						and(
							eq(participantCheckin.projectId, input.projectId),
							eq(participantCheckin.day, day),
						),
					),
				db
					.select({ amount: count() })
					.from(participantCheckin)
					.where(eq(participantCheckin.projectId, input.projectId)),
			]);

			return {
				day,
				todayCount: Number(today[0]?.amount ?? 0),
				totalCount: Number(total[0]?.amount ?? 0),
				eventDays: eventDayCount(row.startDate, row.endDate),
				config,
			};
		}),

	/** O próprio participante opta por sair do ranking público. */
	setRankingOptOut: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
				optOut: z.boolean(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const projectRow = await db.query.project.findFirst({
				where: eq(project.id, input.projectId),
				columns: { gamification: true },
			});
			if (!projectRow) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Evento não encontrado.",
				});
			}
			const config = parseGamificationConfig(projectRow.gamification);
			if (!config.enabled || !config.ranking.allowOptOut) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Opt-out do ranking indisponível neste evento.",
				});
			}

			const participantRow = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, input.projectId),
					eq(participant.userId, ctx.session.user.id),
				),
				columns: { id: true },
			});
			if (!participantRow) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Inscrição não encontrada.",
				});
			}

			await db
				.update(participant)
				.set({ rankingOptOut: input.optOut })
				.where(eq(participant.id, participantRow.id));

			return { optOut: input.optOut };
		}),

	/** Ajuste manual de pontos (positivo ou negativo), auditado. */
	awardManualPoints: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
				participantId: z.string().uuid(),
				points: z
					.number()
					.int()
					.min(-10_000)
					.max(10_000)
					.refine((value) => value !== 0, {
						message: "Informe um valor diferente de zero.",
					}),
				note: z.string().trim().max(500).optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const projectRow = await requireProjectAccess(
				input.projectId,
				ctx.session.user.id,
			);
			const config = projectConfig(projectRow);
			if (!config.enabled) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Gamificação desativada neste evento.",
				});
			}

			const target = await db.query.participant.findFirst({
				where: and(
					eq(participant.id, input.participantId),
					eq(participant.projectId, input.projectId),
				),
				columns: { id: true },
			});
			if (!target) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Participante não encontrado neste evento.",
				});
			}

			return db.transaction(async (tx) => {
				const result = await awardPoints(tx, {
					projectId: input.projectId,
					participantId: input.participantId,
					source: "manual",
					dedupeKey: pointKeys.manual(randomUUID()),
					points: input.points,
					note: input.note ?? null,
					awardedByUserId: ctx.session.user.id,
				});
				const unlockedStickers = await evaluateStickers(
					tx,
					projectRow,
					input.participantId,
				);
				return {
					totalPoints: result.total,
					unlockedStickers,
				};
			});
		}),

	/** Concede um adesivo manualmente (ex.: tarefa de monitor). */
	grantParticipantSticker: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
				participantId: z.string().uuid(),
				stickerKey: z.string().min(1).max(80),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			if (!stickerByKey(input.stickerKey)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Adesivo desconhecido.",
				});
			}
			const target = await db.query.participant.findFirst({
				where: and(
					eq(participant.id, input.participantId),
					eq(participant.projectId, input.projectId),
				),
				columns: { id: true },
			});
			if (!target) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Participante não encontrado neste evento.",
				});
			}

			return db.transaction((tx) =>
				grantSticker(tx, {
					projectId: input.projectId,
					participantId: input.participantId,
					stickerKey: input.stickerKey,
					awardedByUserId: ctx.session.user.id,
				}),
			);
		}),

	/** Total do próprio participante (usado por ilhas do dono). */
	getMyPoints: protectedProcedure
		.input(z.object({ projectId: z.string().uuid() }))
		.query(async ({ input, ctx }) => {
			const participantRow = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, input.projectId),
					eq(participant.userId, ctx.session.user.id),
				),
				columns: { id: true },
			});
			if (!participantRow) return { points: 0 };
			return { points: await getPointsTotal(db, participantRow.id) };
		}),
});
