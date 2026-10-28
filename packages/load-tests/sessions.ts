import { db } from "@verific/drizzle";

import { SESSIONS_FILE, writeSessionsFile } from "./src/sessions-file";

async function main() {
	const started = Date.now();
	const counts = await writeSessionsFile(db);
	console.log(
		`✅ ${SESSIONS_FILE}: ${counts.monitors} monitores, ${counts.enrolled} inscritos, ${counts.newcomers} não inscritos (${((Date.now() - started) / 1000).toFixed(1)}s)`,
	);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("❌", error instanceof Error ? error.message : error);
		process.exit(1);
	});
