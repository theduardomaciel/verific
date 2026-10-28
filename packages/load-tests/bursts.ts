import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import { db } from "@verific/drizzle";
import { seed, todayInBrasilia } from "@verific/drizzle/seed";

import { checkStressEvent } from "./src/report";
import { writeSessionsFile } from "./src/sessions-file";

// Repete a rajada de um fluxo com tamanhos crescentes, recriando o cenário
// antes de cada uma. O limite é a maior rajada que passa nos thresholds.
//
//   pnpm bursts --flow=join --sizes=150,300,450 --env ACTIVITY=spread

const flows = {
	join: "k6/01-join-activity.ts",
	register: "k6/02-event-register.ts",
} as const;
type Flow = keyof typeof flows;

interface Metric {
	"p(95)"?: number;
	value?: number;
	thresholds?: Record<string, boolean>;
}

async function main() {
	const { values } = parseArgs({
		options: {
			flow: { type: "string", default: "join" },
			sizes: { type: "string", default: "150,300,450" },
			// Repassado ao k6 como -e
			env: { type: "string", multiple: true, default: [] },
		},
	});

	if (!(values.flow in flows)) {
		throw new Error(`--flow deve ser ${Object.keys(flows).join(" ou ")}`);
	}
	const flow = values.flow as Flow;
	const sizes = values.sizes.split(",").map(Number);
	const results = [];

	// Conexões ociosas podem cair enquanto o k6 roda; o pool reconecta na próxima consulta
	db.$client.on("error", (error: Error) =>
		console.warn("⚠️  Conexão com o banco caiu:", error.message),
	);

	await mkdir("out/bursts", { recursive: true });
	const label = [flow, ...values.env].join("_").replace(/[^\w=.-]/g, "");
	const summaryFile = `out/bursts/${label}.md`;

	for (const size of sizes) {
		console.log(`\n=== ${flow}: rajada de ${size}`);
		await seed(db, {
			profile: "stress",
			seed: 1,
			reset: true,
			refDate: todayInBrasilia(),
		});
		await writeSessionsFile(db);
		const before = (await checkStressEvent(db)).counts;

		const summaryPath = `out/bursts/${flow}-${size}.json`;
		const k6 = spawnSync(
			"k6",
			[
				"run",
				"-q",
				"-e",
				"PROFILE=burst",
				"-e",
				`TARGET=${size}`,
				...values.env.flatMap((e) => ["-e", e]),
				"--summary-export",
				summaryPath,
				flows[flow],
			],
			{ stdio: "inherit" },
		);
		if (k6.error) throw k6.error;
		// 99 = thresholds violados; qualquer outro código é falha do k6
		if (k6.status !== 0 && k6.status !== 99) {
			throw new Error(`k6 terminou com código ${k6.status}`);
		}

		const metrics: Record<string, Metric> = JSON.parse(
			await readFile(summaryPath, "utf8"),
		).metrics;
		const report = await waitUntilSettled();
		const { counts } = report;

		results.push({
			size,
			p95: metrics[`http_req_duration{flow:${flow}}`]?.["p(95)"],
			sessionP95:
				metrics["http_req_duration{name:get-session}"]?.["p(95)"],
			failed: metrics.http_req_failed?.value,
			thresholdsOk: Object.values(metrics).every((m) =>
				Object.values(m.thresholds ?? {}).every((crossed) => !crossed),
			),
			// O que a rajada gravou no banco
			result:
				flow === "join"
					? `${counts.limit50 + counts.withForm + counts.spread.reduce((a, b) => a + b, 0)} inscritos`
					: `${counts.participants - before.participants} novos participantes`,
			invariantsOk: report.ok,
			overLimit: report.overLimit,
		});
		// Grava a cada rajada para não perder o que já rodou
		await writeFile(summaryFile, `${renderTable(results)}\n`);
	}

	console.log(`\n${renderTable(results)}\n\nResumo em ${summaryFile}`);
}

function renderTable(
	results: {
		size: number;
		p95?: number;
		sessionP95?: number;
		failed?: number;
		thresholdsOk: boolean;
		result: string;
		invariantsOk: boolean;
		overLimit: { name: string; enrolled: number; limit: number | null }[];
	}[],
) {
	const ms = (v?: number) => (v === undefined ? "-" : `${Math.round(v)} ms`);
	return [
		"| Rajada | p95 do fluxo | p95 get-session | Erros | Thresholds | Resultado | Invariantes |",
		"|---|---|---|---|---|---|---|",
		...results.map(
			(r) =>
				`| ${r.size} | ${ms(r.p95)} | ${ms(r.sessionP95)} | ${((r.failed ?? 0) * 100).toFixed(1)}% | ${r.thresholdsOk ? "ok" : "falhou"} | ${r.result} | ${r.invariantsOk ? "ok" : r.overLimit.map((a) => `${a.name}: ${a.enrolled}/${a.limit}`).join("; ")} |`,
		),
	].join("\n");
}

// O servidor pode continuar processando a fila depois que o k6 termina:
// espera as contagens ficarem iguais por 5s antes de ler o resultado
async function waitUntilSettled(timeoutMs = 120_000) {
	const started = Date.now();
	let previous = "";
	for (;;) {
		const report = await checkStressEvent(db);
		const current = JSON.stringify(report.counts);
		if (current === previous || Date.now() - started > timeoutMs) {
			return report;
		}
		previous = current;
		await new Promise((resolve) => setTimeout(resolve, 5000));
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("❌", error instanceof Error ? error.message : error);
		process.exit(1);
	});
