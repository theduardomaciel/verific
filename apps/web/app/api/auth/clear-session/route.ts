import { cookies, headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@verific/auth";

import { SESSION_MARKER_COOKIE } from "@/lib/session-marker";

const SECURE_PREFIX = "__Secure-";

/**
 * Destino dos layouts quando o cookie aponta para uma sessão que não existe
 * mais. Só limpa os cookies se não houver sessão válida: um link de outro
 * site para esta rota não desloga ninguém.
 */
export async function GET(request: NextRequest) {
	const requestHeaders = await headers();
	const session = await auth.api.getSession({
		headers: requestHeaders,
		query: { disableCookieCache: true, disableRefresh: true },
	});
	if (session) {
		return NextResponse.redirect(new URL("/account", request.url));
	}

	const signOut = await auth.api.signOut({
		headers: requestHeaders,
		returnHeaders: true,
	});

	// Os cookies que o `signOut` expira chegam à resposta sem o `Max-Age=0`,
	// só esvaziados; `expires` no passado os apaga de fato.
	// Também a variante com o outro prefixo: o proxy aceita as duas, e uma
	// que sobrasse mandaria o usuário de volta para cá em loop.
	const names = new Set(
		signOut.headers
			.getSetCookie()
			.map((cookie) => cookie.slice(0, cookie.indexOf("=")))
			.flatMap((name) =>
				name.startsWith(SECURE_PREFIX)
					? [name, name.slice(SECURE_PREFIX.length)]
					: [name, `${SECURE_PREFIX}${name}`],
			),
	);
	names.add(SESSION_MARKER_COOKIE);
	const cookieStore = await cookies();
	for (const name of names) {
		cookieStore.set(name, "", {
			path: "/",
			expires: new Date(0),
			secure: name.startsWith(SECURE_PREFIX),
		});
	}

	return NextResponse.redirect(new URL("/auth", request.url));
}
