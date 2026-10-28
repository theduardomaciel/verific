import { Receiver } from "@upstash/qstash";

import { env } from "@verific/env";

/**
 * Corpo de uma entrega do QStash, só se a assinatura conferir com as
 * chaves configuradas; null em qualquer outro caso.
 */
export async function readVerifiedQStashBody(
	request: Request,
): Promise<string | null> {
	const currentSigningKey = env.QSTASH_CURRENT_SIGNING_KEY;
	if (!currentSigningKey) return null;

	const signature = request.headers.get("upstash-signature");
	const body = await request.text();
	if (!signature) return null;

	const receiver = new Receiver({
		currentSigningKey,
		nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
	});
	try {
		await receiver.verify({ signature, body });
	} catch {
		return null;
	}
	return body;
}
