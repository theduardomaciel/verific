import { db } from "@verific/drizzle";
import { desc, eq } from "@verific/drizzle/orm";
import {
	activity,
	activitySession,
	participant,
	participantCheckin,
	participantOnActivity,
	sessionAttendance,
	user,
} from "@verific/drizzle/schema";
import { z } from "@verific/zod";

import { requireProjectAccess } from "../lib/project-access";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export type ActivityLogEntry = {
	id: string;
	type: "enrollment" | "activity-checkin" | "reception-checkin";
	at: Date;
	participantId: string;
	participantName: string;
	activityId: string | null;
	activityName: string | null;
	/** Detalhe curto (papel, sessão, saída etc.). */
	detail: string | null;
};

/**
 * Log operacional do evento: inscrições em atividades, credenciamento nas
 * sessões e check-ins da recepção, em ordem cronológica inversa.
 *
 * Leitura liberada para qualquer membro da equipe (inclusive monitores),
 * como o resumo do dashboard; não expõe contatos além do nome.
 */
export const logsRouter = createTRPCRouter({
	getActivityLog: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
				limit: z.number().int().min(1).max(200).default(50),
			}),
		)
		.query(
			async ({
				input,
				ctx,
			}): Promise<{ entries: ActivityLogEntry[] }> => {
				const { projectId, limit } = input;
				await requireProjectAccess(projectId, ctx.session.user.id);

				const [enrollments, activityCheckins, receptionCheckins] =
					await Promise.all([
						db
							.select({
								participantId:
									participantOnActivity.participantId,
								at: participantOnActivity.subscribedAt,
								participantName: user.name,
								activityId: activity.id,
								activityName: activity.name,
								role: participantOnActivity.role,
								overbooked: participantOnActivity.overbooked,
							})
							.from(participantOnActivity)
							.innerJoin(
								activity,
								eq(
									activity.id,
									participantOnActivity.activityId,
								),
							)
							.innerJoin(
								participant,
								eq(
									participant.id,
									participantOnActivity.participantId,
								),
							)
							.innerJoin(user, eq(user.id, participant.userId))
							.where(eq(activity.projectId, projectId))
							.orderBy(desc(participantOnActivity.subscribedAt))
							.limit(limit),
						db
							.select({
								participantId: sessionAttendance.participantId,
								at: sessionAttendance.joinedAt,
								leftAt: sessionAttendance.leftAt,
								participantName: user.name,
								activityId: activity.id,
								activityName: activity.name,
							})
							.from(sessionAttendance)
							.innerJoin(
								activitySession,
								eq(
									activitySession.id,
									sessionAttendance.sessionId,
								),
							)
							.innerJoin(
								activity,
								eq(activity.id, activitySession.activityId),
							)
							.innerJoin(
								participant,
								eq(
									participant.id,
									sessionAttendance.participantId,
								),
							)
							.innerJoin(user, eq(user.id, participant.userId))
							.where(eq(activity.projectId, projectId))
							.orderBy(desc(sessionAttendance.joinedAt))
							.limit(limit),
						db
							.select({
								participantId: participantCheckin.participantId,
								at: participantCheckin.checkedInAt,
								participantName: user.name,
								day: participantCheckin.day,
							})
							.from(participantCheckin)
							.innerJoin(
								participant,
								eq(
									participant.id,
									participantCheckin.participantId,
								),
							)
							.innerJoin(user, eq(user.id, participant.userId))
							.where(eq(participantCheckin.projectId, projectId))
							.orderBy(desc(participantCheckin.checkedInAt))
							.limit(limit),
					]);

				const entries: ActivityLogEntry[] = [
					...enrollments.map((row) => ({
						id: `enrollment:${row.activityId}:${row.participantId}:${row.at.toISOString()}`,
						type: "enrollment" as const,
						at: row.at,
						participantId: row.participantId,
						participantName: row.participantName,
						activityId: row.activityId,
						activityName: row.activityName,
						detail:
							row.role === "monitor"
								? "Monitor inscrito na atividade"
								: row.overbooked
									? "Inscrição acima da capacidade"
									: "Inscrição confirmada",
					})),
					...activityCheckins.map((row) => ({
						id: `activity-checkin:${row.activityId}:${row.participantId}:${row.at.toISOString()}`,
						type: "activity-checkin" as const,
						at: row.at,
						participantId: row.participantId,
						participantName: row.participantName,
						activityId: row.activityId,
						activityName: row.activityName,
						detail: row.leftAt
							? `Credenciado e saiu às ${row.leftAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
							: "Credenciado na sessão",
					})),
					...receptionCheckins.map((row) => ({
						id: `reception-checkin:${row.participantId}:${row.day}`,
						type: "reception-checkin" as const,
						at: row.at,
						participantId: row.participantId,
						participantName: row.participantName,
						activityId: null,
						activityName: null,
						detail: "Check-in na recepção",
					})),
				]
					.sort((a, b) => b.at.getTime() - a.at.getTime())
					.slice(0, limit);

				return { entries };
			},
		),
});
