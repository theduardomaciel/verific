/**
 * Dev-only preview for every registered e-mail template.
 *
 * Renders each registry entry with its `previewProps` and hands the result to
 * the console provider (the same send path used in development), so the
 * output lands in `packages/api/.email-previews/` when NODE_ENV=development.
 * No database query is performed.
 *
 * Usage:
 *   pnpm --filter @verific/api email:preview
 *
 * Env comes from `apps/web/.env` (NEXT_PUBLIC_APP_URL is required by the URL
 * helper). The `server-only` marker import is stubbed because this script runs
 * outside Next.js; registry modules stay untouched.
 */
import nodeModule from "node:module";
import path from "node:path";

// Must run before importing anything that validates env.
const envPath = path.resolve(__dirname, "../../../apps/web/.env");
try {
	process.loadEnvFile(envPath);
} catch {
	console.warn(
		`[preview] could not load ${envPath}; falling back to process.env.`,
	);
}

const moduleLoader = nodeModule as unknown as {
	_load: (
		request: string,
		parent: NodeModule | null,
		isMain: boolean,
	) => unknown;
};
const originalLoad = moduleLoader._load;
moduleLoader._load = function (request, parent, isMain) {
	if (request === "server-only") return {};
	return originalLoad.call(moduleLoader, request, parent, isMain);
};

async function main() {
	const { notificationRegistry } = await import("./registry");
	const { createConsoleProvider } = await import("./providers/console");

	const provider = createConsoleProvider();
	const from = process.env["EMAIL_FROM"] ?? "preview@example.com";
	const recipients = {
		participant: "participante@example.com",
		organizer: "organizador@example.com",
	} as const;

	let failures = 0;
	for (const definition of Object.values(notificationRegistry)) {
		const props = definition.previewProps;
		const label = `${definition.key} (${definition.audience})`;
		try {
			const rendered = await definition.render(props);
			const subject = definition.subject(props);
			const result = await provider.send({
				to: recipients[definition.audience],
				from,
				subject,
				html: rendered.html,
				text: rendered.text,
			});
			console.log(
				`[preview] ok  ${label} — "${subject}" (${result.ok ? result.providerMessageId : "failed"})`,
			);
		} catch (error) {
			failures += 1;
			console.error(`[preview] failed ${label}:`, error);
		}
	}

	if (failures > 0) {
		console.error(
			`[preview] ${failures} template(s) failed. HTML previews were not written.`,
		);
		process.exitCode = 1;
		return;
	}
	console.log(
		`[preview] done. HTML previews: ${path.resolve(process.cwd(), ".email-previews")}`,
	);
}

void main();
