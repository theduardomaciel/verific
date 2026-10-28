import { db } from "@verific/drizzle";
import { and, desc, eq, ilike, inArray, lt, or } from "@verific/drizzle/orm";
import {
	EVENT_LOG_TYPES,
	eventLog,
	type EventLogType,
} from "@verific/drizzle/schema";
import { z } from "@verific/zod";

import { containsPattern } from "../lib/like";
import { requireProjectAccess } from "../lib/project-access";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export type ActivityLogEntry = {
	id: string;
	type: EventLogType;
	at: Date;
	participantId: string | null;
	participantName: string | null;
	activityId: string | null;
	activityName: string | null;
	actorName: string | null;
	/** Detalhe curto derivado do metadata (motivo, dia etc.). */
	detail: string | null;
	metadata: Record<string, unknown>;
};

const cursorSchema = z
	.object({ createdAt: z.date(), id: z.string().uuid() })
	.nullish();

function detailOf(
	type: EventLogType,
	metadata: Record<string, unknown>,
): string | null {
	const reason =
		typeof metadata.reason === "string" ? metadata.reason.trim() : "";
	if (reason) return reason;
	if (type === "reception.checkin" && typeof metadata.day === "string") {
		return `Dia ${metadata.day}`;
	}
	return null;
}

/**
 * Log operacional do evento, lido de `event_logs` (append-only). Cada ação
 * grava sua própria linha; aqui só filtramos e paginamos. Leitura liberada
 * para qualquer membro da equipe (inclusive monitores).
 */
export const logsRouter = createTRPCRouter({
	getActivityLog: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
				search: z.string().trim().max(200).optional(),
				types: z.array(z.enum(EVENT_LOG_TYPES)).optional(),
				cursor: cursorSchema,
				limit: z.number().int().min(1).max(200).default(50),
			}),
		)
		.query(
			async ({
				input,
				ctx,
			}): Promise<{
				entries: ActivityLogEntry[];
				nextCursor: { createdAt: Date; id: string } | null;
			}> => {
				const { projectId, search, types, cursor, limit } = input;
				await requireProjectAccess(projectId, ctx.session.user.id);

				const pattern = search ? containsPattern(search) : null;
				const where = and(
					eq(eventLog.projectId, projectId),
					types && types.length > 0
						? inArray(eventLog.type, types)
						: undefined,
					pattern
						? or(
								ilike(eventLog.participantName, pattern),
								ilike(eventLog.activityName, pattern),
								ilike(eventLog.actorName, pattern),
							)
						: undefined,
					cursor
						? or(
								lt(eventLog.createdAt, cursor.createdAt),
								and(
									eq(eventLog.createdAt, cursor.createdAt),
									lt(eventLog.id, cursor.id),
								),
							)
						: undefined,
				);

				const rows = await db
					.select()
					.from(eventLog)
					.where(where)
					.orderBy(desc(eventLog.createdAt), desc(eventLog.id))
					.limit(limit + 1);

				const hasMore = rows.length > limit;
				const page = hasMore ? rows.slice(0, limit) : rows;
				const last = page[page.length - 1];

				return {
					entries: page.map((row) => ({
						id: row.id,
						type: row.type,
						at: row.createdAt,
						participantId: row.participantId,
						participantName: row.participantName,
						activityId: row.activityId,
						activityName: row.activityName,
						actorName: row.actorName,
						detail: detailOf(row.type, row.metadata),
						metadata: row.metadata,
					})),
					nextCursor:
						hasMore && last
							? { createdAt: last.createdAt, id: last.id }
							: null,
				};
			},
		),
});
