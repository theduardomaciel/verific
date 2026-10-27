import { makeSignature } from "better-auth/crypto";

import { auth } from "@verific/auth";

// Cria uma sessão no banco, como o login faria, e devolve o valor do cookie
// `session_token` já assinado. Dispensa o login pelo Google.
// O nome do cookie depende do NODE_ENV do servidor, não deste script.
export async function createSessionCookie(userId: string) {
	const ctx = await auth.$context;
	const session = await ctx.internalAdapter.createSession(userId);
	const signature = await makeSignature(session.token, ctx.secret);
	return encodeURIComponent(`${session.token}.${signature}`);
}

export async function mapWithConcurrency<T, R>(
	items: T[],
	concurrency: number,
	fn: (item: T) => Promise<R>,
) {
	const results: R[] = [];
	let next = 0;
	const workers = Array.from({ length: concurrency }, async () => {
		while (next < items.length) {
			const index = next++;
			results[index] = await fn(items[index]!);
		}
	});
	await Promise.all(workers);
	return results;
}
