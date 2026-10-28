import "dotenv/config";
import { Pool } from "@neondatabase/serverless";
import { and, asc, eq, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { parseArgs } from "node:util";

import { drizzle_env as env } from "@verific/env/drizzle_env";

import * as schema from "../schema";
import { insertInChunks, SEED_URL_PREFIX, todayInBrasilia } from "./utils";

import type { EventLogType } from "../schema";

// Popula `event_logs` com um histórico fictício e variado para testar a aba
// de Logs. Idempotente: apaga apenas as linhas marcadas com `metadata.seed`
// do evento alvo e as recria.
//
// Uso:
//   pnpm db:seed:logs
//   pnpm --filter @verific/drizzle db:seed:logs -- --projectUrl=seed-secomp
//   pnpm --filter @verific/drizzle db:seed:logs -- --projectId=<uuid> --prod

const productionFlags = new Set([
	"--prod",
	"--production",
	"--target=prod",
	"--target=production",
	"prod",
	"production",
]);

const isProduction = process.argv
	.slice(2)
	.some((arg) => productionFlags.has(arg.toLowerCase()));

const usage =
	"Uso: pnpm db:seed:logs [--projectUrl=URL | --projectId=ID] [--prod]";

type LogRow = typeof schema.eventLog.$inferInsert;

function meta(extra: Record<string, unknown> = {}) {
	return { seed: true, ...extra };
}

async function main() {
	const { values } = parseArgs({
		options: {
			projectUrl: { type: "string" },
			projectId: { type: "string" },
			prod: { type: "boolean", default: false },
			production: { type: "boolean", default: false },
			target: { type: "string" },
		},
	});

	const targetProduction =
		isProduction ||
		values.prod ||
		values.production ||
		values.target?.toLowerCase() === "prod" ||
		values.target?.toLowerCase() === "production";

	const databaseUrl = targetProduction
		? env.PRODUCTION_DATABASE_URL
		: env.DATABASE_URL;
	if (!databaseUrl) {
		console.error(
			"❌ PRODUCTION_DATABASE_URL não configurada. Adicione ao packages/drizzle/.env.",
		);
		process.exit(1);
	}

	const { host, pathname } = new URL(databaseUrl);
	console.log(
		`🌱 Semeando logs em ${host}${pathname} (${targetProduction ? "production" : "development"})...`,
	);

	const pool = new Pool({ connectionString: databaseUrl });
	try {
		const db = drizzle(pool, { schema });

		const projects =
			values.projectId || values.projectUrl
				? await db
						.select({
							id: schema.project.id,
							url: schema.project.url,
							ownerId: schema.project.ownerId,
						})
						.from(schema.project)
						.where(
							values.projectId
								? eq(schema.project.id, values.projectId)
								: eq(schema.project.url, values.projectUrl!),
						)
				: await db
						.select({
							id: schema.project.id,
							url: schema.project.url,
							ownerId: schema.project.ownerId,
						})
						.from(schema.project)
						.where(like(schema.project.url, `${SEED_URL_PREFIX}%`));

		if (projects.length === 0) {
			console.error(
				values.projectId || values.projectUrl
					? `❌ Evento não encontrado.\n${usage}`
					: `❌ Nenhum evento de seed encontrado. Rode \`pnpm db:seed\` primeiro ou passe --projectUrl/--projectId.\n${usage}`,
			);
			process.exit(1);
		}

		const base = todayInBrasilia();
		const day = base.toISOString().slice(0, 10);
		let total = 0;

		for (const project of projects) {
			const [activities, sessions, people, owners, monitors] =
				await Promise.all([
					db
						.select({
							id: schema.activity.id,
							name: schema.activity.name,
						})
						.from(schema.activity)
						.where(eq(schema.activity.projectId, project.id))
						.orderBy(asc(schema.activity.name)),
					db
						.select({
							id: schema.activitySession.id,
							activityId: schema.activitySession.activityId,
							startsAt: schema.activitySession.startsAt,
						})
						.from(schema.activitySession)
						.innerJoin(
							schema.activity,
							eq(
								schema.activity.id,
								schema.activitySession.activityId,
							),
						)
						.where(eq(schema.activity.projectId, project.id))
						.orderBy(asc(schema.activitySession.startsAt)),
					db
						.select({
							id: schema.participant.id,
							name: schema.user.name,
						})
						.from(schema.participant)
						.innerJoin(
							schema.user,
							eq(schema.user.id, schema.participant.userId),
						)
						.where(eq(schema.participant.projectId, project.id))
						.orderBy(asc(schema.participant.joinedAt)),
					db
						.select({ name: schema.user.name })
						.from(schema.user)
						.where(eq(schema.user.id, project.ownerId)),
					db
						.select({
							participantId:
								schema.participantOnActivity.participantId,
							activityId: schema.participantOnActivity.activityId,
						})
						.from(schema.participantOnActivity)
						.innerJoin(
							schema.activity,
							eq(
								schema.activity.id,
								schema.participantOnActivity.activityId,
							),
						)
						.where(
							and(
								eq(schema.activity.projectId, project.id),
								eq(
									schema.participantOnActivity.role,
									"monitor",
								),
							),
						),
				]);

			if (activities.length === 0 || people.length === 0) {
				console.log(
					`⏭️  /${project.url}: sem atividades ou participantes, pulando.`,
				);
				continue;
			}

			const ownerName = owners[0]?.name ?? null;
			const rows: LogRow[] = [];
			let tick = 0;
			const at = () => new Date(base.getTime() - tick++ * 7 * 60 * 1000);
			const person = (index: number) => people[index % people.length]!;
			const add = (row: Omit<LogRow, "projectId" | "createdAt">) => {
				rows.push({
					projectId: project.id,
					createdAt: at(),
					...row,
				});
			};

			activities.forEach((activity, activityIndex) => {
				const activitySessions = sessions.filter(
					(session) => session.activityId === activity.id,
				);
				const activityMonitors = monitors.filter(
					(monitor) => monitor.activityId === activity.id,
				);
				const activityPerson = (index: number) =>
					person(activityIndex + index);

				add({
					type: "activity.created" satisfies EventLogType,
					activityId: activity.id,
					activityName: activity.name,
					actorUserId: project.ownerId,
					actorName: ownerName,
					metadata: meta({ source: "seed" }),
				});
				add({
					type: "activity.updated",
					activityId: activity.id,
					activityName: activity.name,
					actorUserId: project.ownerId,
					actorName: ownerName,
					metadata: meta(),
				});

				const monitor = activityMonitors[0];
				if (monitor) {
					const monitorPerson =
						people.find((p) => p.id === monitor.participantId) ??
						activityPerson(0);
					add({
						type: "activity.monitor_added",
						activityId: activity.id,
						activityName: activity.name,
						participantId: monitorPerson.id,
						participantName: monitorPerson.name,
						actorUserId: project.ownerId,
						actorName: ownerName,
						metadata: meta(),
					});
				}

				const perActivity = Math.min(people.length, 5);
				for (let i = 0; i < perActivity; i++) {
					const p = activityPerson(i);
					add({
						type: "enrollment.created",
						participantId: p.id,
						participantName: p.name,
						activityId: activity.id,
						activityName: activity.name,
						metadata: meta(),
					});

					const session =
						activitySessions.length > 0
							? activitySessions[i % activitySessions.length]
							: null;
					if (session) {
						add({
							type: "session.checkin",
							participantId: p.id,
							participantName: p.name,
							activityId: activity.id,
							activityName: activity.name,
							metadata: meta({ sessionId: session.id }),
						});
						if (i % 2 === 0) {
							add({
								type: "session.checkout",
								participantId: p.id,
								participantName: p.name,
								activityId: activity.id,
								activityName: activity.name,
								metadata: meta({ sessionId: session.id }),
							});
						}
					}

					add({
						type: "reception.checkin",
						participantId: p.id,
						participantName: p.name,
						actorUserId: project.ownerId,
						actorName: ownerName,
						metadata: meta({ day }),
					});
				}

				const extras: Array<{
					type: EventLogType;
					reason?: string;
				}> = [
					{ type: "enrollment.overbooked", reason: "Acomodação" },
					{ type: "enrollment.cancelled" },
					{
						type: "enrollment.removed",
						reason: "Faltou ao encontro",
					},
					{ type: "enrollment.no_show_released" },
				];
				extras.forEach((extra, index) => {
					const p = activityPerson(index);
					add({
						type: extra.type,
						participantId: p.id,
						participantName: p.name,
						activityId: activity.id,
						activityName: activity.name,
						actorUserId: project.ownerId,
						actorName: ownerName,
						metadata: meta(
							extra.reason ? { reason: extra.reason } : {},
						),
					});
				});

				const waitlistTypes: EventLogType[] = [
					"waitlist.joined",
					"waitlist.offered",
					"waitlist.confirmed",
					"waitlist.promoted",
					"waitlist.expired",
					"waitlist.removed",
					"waitlist.revoked",
				];
				waitlistTypes.forEach((type, index) => {
					const p = activityPerson(index);
					add({
						type,
						participantId: p.id,
						participantName: p.name,
						activityId: activity.id,
						activityName: activity.name,
						actorUserId: project.ownerId,
						actorName: ownerName,
						metadata: meta({
							waitlistStatus: type.replace("waitlist.", ""),
						}),
					});
				});
			});

			const lastActivity = activities[activities.length - 1]!;
			add({
				type: "activity.cancelled",
				activityId: lastActivity.id,
				activityName: lastActivity.name,
				actorUserId: project.ownerId,
				actorName: ownerName,
				metadata: meta({ waitlistClosed: 0 }),
			});

			const removedPerson = person(people.length - 1);
			add({
				type: "participant.removed_event",
				participantId: removedPerson.id,
				participantName: removedPerson.name,
				actorUserId: project.ownerId,
				actorName: ownerName,
				metadata: meta({ reason: "Teste de log" }),
			});

			// Idempotência: remove só o que este script criou.
			await db
				.delete(schema.eventLog)
				.where(
					and(
						eq(schema.eventLog.projectId, project.id),
						sql`${schema.eventLog.metadata}->>'seed' = 'true'`,
					),
				);
			await insertInChunks(db, schema.eventLog, rows);
			total += rows.length;
			console.log(`✅ /${project.url}: ${rows.length} registros de log`);
		}

		console.log(`✅ ${total} registros criados (idempotente).`);
	} finally {
		await pool.end();
	}
}

main().catch((error) => {
	console.error(
		"❌ Erro ao semear logs:",
		error instanceof Error ? error.message : error,
	);
	process.exit(1);
});
