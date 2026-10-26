/**
 * Runs work after the response when a Next.js runtime is available
 * (`after()` keeps serverless work from being cut off); otherwise awaits it
 * inline. Never throws and never lets background failures surface.
 */
export async function scheduleAfterResponse(
	work: () => Promise<void>,
): Promise<void> {
	let scheduled = false;
	try {
		const { after } = await import("next/server");
		if (typeof after === "function") {
			// after() waits only for the promise the callback returns
			after(() =>
				work().catch((err: unknown) => {
					console.error(
						"[after] background work failed:",
						err instanceof Error ? err.message : String(err),
					);
				}),
			);
			scheduled = true;
		}
	} catch {
		// No Next runtime (tests, scripts): fall through to inline below.
	}
	if (!scheduled) {
		try {
			await work();
		} catch (err) {
			console.error(
				"[after] background work failed:",
				err instanceof Error ? err.message : String(err),
			);
		}
	}
}
