import { db } from "@verific/drizzle";

import { checkStressEvent } from "./src/report";

async function main() {
	const report = await checkStressEvent(db);
	console.log(report.lines.join("\n"));
	console.log(
		report.ok ? "✅ Invariantes válidas" : "❌ Invariantes violadas",
	);
	return report.ok;
}

main()
	.then((ok) => process.exit(ok ? 0 : 1))
	.catch((error) => {
		console.error("❌", error instanceof Error ? error.message : error);
		process.exit(1);
	});
