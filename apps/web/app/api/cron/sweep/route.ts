import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { runSweep } from "@verific/api/notifications/service";

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a[i]! ^ b[i]!;
	}
	return result === 0;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
	// Verify CRON_SECRET
	const cronSecret = (process.env.CRON_SECRET as string) ?? "";
	if (!cronSecret) {
		console.error(
			"[cron-sweep] CRON_SECRET not configured, refusing to run",
		);
		return NextResponse.json(
			{ error: "CRON_SECRET not configured" },
			{ status: 500 },
		);
	}

	const authHeader = request.headers.get("authorization");
	if (!authHeader) {
		return NextResponse.json(
			{ error: "Missing authorization" },
			{ status: 401 },
		);
	}

	const providedSecret = authHeader.replace(/^Bearer\s+/i, "");
	if (providedSecret.length !== cronSecret.length) {
		return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
	}

	// Use timing-safe comparison
	const encoder = new TextEncoder();
	const match = timingSafeEqual(
		encoder.encode(providedSecret),
		encoder.encode(cronSecret),
	);

	if (!match) {
		return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
	}

	try {
		const result = await runSweep({ timeBudgetMs: 25_000 });
		return NextResponse.json(result);
	} catch (err) {
		console.error("[cron-sweep] Error:", err);
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}

// Increase maxDuration for the route (Vercel Hobby: 30s)
export const maxDuration = 30;
