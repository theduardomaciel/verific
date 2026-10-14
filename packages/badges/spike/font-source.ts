/**
 * Spike: legitimate static-TTF source per family+weight (gwfh metadata →
 * fonts.gstatic.com static TTF, OFL). Run: pnpm --filter @verific/badges
 * spike:fonts. Reports byte sizes + CORS/CSP notes. No files committed.
 */
import { createStaticTtfFetcher } from "../fonts";

const FONTS: { family: string; weights: number[] }[] = [
	{ family: "Hanken Grotesk", weights: [400, 500, 600, 700] },
	{ family: "REM", weights: [400, 500, 600, 700] },
	{ family: "Inter", weights: [400, 500, 600, 700] },
	{ family: "Sora", weights: [400, 600, 700] },
	{ family: "Space Grotesk", weights: [400, 500, 700] },
];

async function main() {
	const fetcher = createStaticTtfFetcher();
	let failures = 0;
	let total = 0;
	for (const { family, weights } of FONTS) {
		for (const weight of weights) {
			try {
				const bytes = await fetcher({ family, weight });
				const magic = Buffer.from(bytes.slice(0, 4)).toString("hex");
				const ok = magic === "00010000" || magic === "4f54544f";
				console.log(
					`${ok ? "OK  " : "WARN"} ${family} @${weight}: ${bytes.length} bytes (magic ${magic})`,
				);
				if (!ok) failures++;
				total += bytes.length;
			} catch (e) {
				console.log(
					`FAIL ${family} @${weight}: ${e instanceof Error ? e.message : String(e)}`,
				);
				failures++;
			}
		}
	}
	console.log(
		`Total ${(total / 1024).toFixed(0)} KiB for ${FONTS.reduce((n, f) => n + f.weights.length, 0)} files. ` +
			"Licensing: OFL (embed allowed). CORS: fonts.gstatic.com ACAO:*; " +
			"CSP needs connect-src https://gwfh.mranftl.com https://fonts.gstatic.com " +
			"(or proxy metadata via server route).",
	);
	process.exit(failures === 0 ? 0 : 1);
}

await main();
