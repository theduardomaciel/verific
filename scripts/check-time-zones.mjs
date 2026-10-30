// Datas e fusos passam por `packages/drizzle/time.ts`. Fora dele, falha com
// o nome de um fuso ou com formatação e leitura no fuso do processo.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCAN = ["apps/web", "packages"];
const SKIP_DIRS = new Set([
	"node_modules",
	".next",
	"dist",
	"migrations",
	".turbo",
]);
const ALLOWED = new Set([
	"packages/drizzle/time.ts",
	// Calendário do shadcn: datas na meia-noite local só carregam o dia
	"apps/web/components/ui/calendar.tsx",
]);
const RULES = [
	[/["'`]America\//, "nome de fuso: use DEFAULT_TIME_ZONE ou eventTimeZone"],
	[/\.toLocale(Date|Time)String\(/, "formatação no fuso do processo"],
	[
		/\.(get|set)(Hours|Minutes|Date|Day|Month|FullYear)\(/,
		"leitura no fuso do processo",
	],
	[/\.toTimeString\(/, "hora no fuso do processo"],
];

function* files(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) yield* files(join(dir, entry.name));
		} else if (
			/\.(ts|tsx|mts)$/.test(entry.name) &&
			!/\.test\./.test(entry.name)
		) {
			yield join(dir, entry.name);
		}
	}
}

const problems = [];
for (const base of SCAN) {
	for (const file of files(join(ROOT, base))) {
		const path = relative(ROOT, file).replaceAll("\\", "/");
		if (ALLOWED.has(path) || path.startsWith("apps/web/test/")) continue;
		readFileSync(file, "utf8")
			.split("\n")
			.forEach((line, index) => {
				for (const [pattern, message] of RULES) {
					if (pattern.test(line)) {
						problems.push(`${path}:${index + 1}: ${message}`);
					}
				}
			});
	}
}

if (problems.length > 0) {
	console.error(problems.join("\n"));
	process.exit(1);
}
console.log("Fusos: nenhum uso fora de packages/drizzle/time.ts.");
