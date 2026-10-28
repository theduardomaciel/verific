import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { SeedDb } from "@verific/drizzle/seed";

import { buildFormAnswers } from "./registration";
import { createSessionCookie, mapWithConcurrency } from "./sessions";
import { loadStressEvent } from "./stress-event";

export const SESSIONS_FILE = "out/sessions.json";

/** Formato do `sessions.json`, lido pelos scripts do k6 */
export type SessionsFile = Awaited<ReturnType<typeof buildSessionsFile>>;

async function buildSessionsFile(db: SeedDb) {
	const data = await loadStressEvent(db);

	const withCookies = <T extends { userId: string }>(rows: T[]) =>
		mapWithConcurrency(rows, 20, async (row) => ({
			...row,
			cookie: await createSessionCookie(row.userId),
		}));

	return {
		createdAt: new Date().toISOString(),
		event: {
			...data.event,
			registrationAnswers: await buildFormAnswers(
				db,
				data.event.projectId,
			),
			activityFormAnswers: await buildFormAnswers(
				db,
				data.event.projectId,
				data.event.activities.withForm,
			),
		},
		monitors: await withCookies(data.monitors),
		enrolled: await withCookies(data.enrolled),
		newcomers: await withCookies(data.newcomers),
	};
}

// Uma sessão por usuário do cenário de estresse, no formato lido pelo k6
export async function writeSessionsFile(db: SeedDb, path = SESSIONS_FILE) {
	const output = await buildSessionsFile(db);

	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, JSON.stringify(output));

	return {
		monitors: output.monitors.length,
		enrolled: output.enrolled.length,
		newcomers: output.newcomers.length,
	};
}
