import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { processScheduledRetry } from "@verific/api/notifications/service";
import { env } from "@verific/env";

import { readVerifiedQStashBody } from "@/lib/qstash";

/**
 * Rodada de reenvio de uma notificação que falhou por erro temporário,
 * agendada pelo serviço de notificações no QStash.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	if (!env.QSTASH_CURRENT_SIGNING_KEY) {
		console.error(
			"[notification-retry] Signing keys not configured, refusing to run",
		);
		return NextResponse.json(
			{ error: "Signing keys not configured" },
			{ status: 500 },
		);
	}

	const body = await readVerifiedQStashBody(request);
	if (body === null) {
		return NextResponse.json(
			{ error: "Invalid signature" },
			{ status: 401 },
		);
	}

	let notificationId: unknown;
	try {
		notificationId = (JSON.parse(body) as { notificationId?: unknown })
			.notificationId;
	} catch {
		notificationId = undefined;
	}
	if (typeof notificationId !== "string" || notificationId.length === 0) {
		// Corpo inválido nunca vai dar certo: 200 para o QStash não repetir
		return NextResponse.json({ status: "no-op", reason: "invalid-body" });
	}

	try {
		return NextResponse.json(await processScheduledRetry(notificationId));
	} catch (err) {
		console.error("[notification-retry] Error:", err);
		// 500 faz o QStash tentar a entrega de novo
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
