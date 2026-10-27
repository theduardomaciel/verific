import { check } from "k6";
import http, { type RefinedResponse, type ResponseType } from "k6/http";

import type { RouterInputs } from "@verific/api";

import {
	BASE_URL,
	COOKIE_CACHE,
	COOKIE_PREFIX,
	EXTRA_HEADERS,
	SAME_IP,
} from "./config.ts";

// Nome e entrada das procedures conferidos contra o `AppRouter`: se o app
// renomear uma procedure ou mudar a entrada, o `pnpm typecheck` acusa.
type Procedure = keyof RouterInputs;
type Response = RefinedResponse<ResponseType | undefined>;

interface RequestOptions {
	name: string;
	flow?: string;
	headers?: Record<string, string>;
	expected?: number[];
}

interface TrpcItem {
	error?: { json: { message: string; data?: { reason?: string } } };
}

const rand = (n: number) => Math.floor(Math.random() * n);

// O better-auth limita /api/auth/* por IP: por padrão cada usuário simula
// um IP próprio (ver SAME_IP em config.ts)
function clientIp() {
	if (SAME_IP === "true") return null;
	return SAME_IP ?? `10.${rand(256)}.${rand(256)}.${rand(254) + 1}`;
}

// Simula um navegador: guarda o cookie de sessão e o cookie cache do better-auth.
// O header Cookie é montado à mão porque o jar do k6 descarta cookies `Secure` em http.
export class Client {
	private sessionData: string | null = null;
	private readonly ip = clientIp();

	constructor(private readonly sessionCookie: string | null) {}

	private headers(extra: Record<string, string> = {}) {
		const cookies: string[] = [];
		if (this.sessionCookie) {
			cookies.push(
				`${COOKIE_PREFIX}.session_token=${this.sessionCookie}`,
			);
		}
		if (COOKIE_CACHE && this.sessionData) {
			cookies.push(`${COOKIE_PREFIX}.session_data=${this.sessionData}`);
		}
		return {
			...EXTRA_HEADERS,
			...(this.ip && { "X-Forwarded-For": this.ip }),
			...(cookies.length > 0 && { Cookie: cookies.join("; ") }),
			...extra,
		};
	}

	private request(
		method: string,
		path: string,
		body: string | null,
		{ name, flow, headers, expected }: RequestOptions,
	): Response {
		http.cookieJar().clear(BASE_URL);
		const res = http.request(method, `${BASE_URL}${path}`, body, {
			headers: this.headers(headers),
			tags: { name, ...(flow && { flow }) },
			...(expected && {
				responseCallback: http.expectedStatuses(...expected),
			}),
		});
		const data = res.cookies[`${COOKIE_PREFIX}.session_data`];
		if (data && data.length > 0) this.sessionData = data[0]!.value;
		return res;
	}

	// Carga inicial de uma página, ou navegação client-side (payload RSC)
	page(
		path: string,
		{
			flow,
			label,
			rsc = false,
		}: { flow?: string; label?: string; rsc?: boolean } = {},
	) {
		const res = this.request("GET", path, null, {
			name: `${rsc ? "rsc" : "page"} ${label ?? path}`,
			flow,
			headers: rsc ? { RSC: "1" } : {},
		});
		check(res, { "página 200": (r) => r.status === 200 });
		return res;
	}

	// O que `authClient.getSession()` faz para quem tem sessão
	getSession(flow?: string) {
		const res = this.request("GET", "/api/auth/get-session", null, {
			name: "get-session",
			flow,
		});
		check(res, {
			"sessão válida": (r) => r.status === 200 && r.json() !== null,
		});
		return res;
	}

	// Queries em lote, no formato do httpBatchLink com superjson
	query<P extends Procedure>(
		procedures: { [K in P]: RouterInputs[K] },
		{ flow }: { flow?: string } = {},
	) {
		const names = Object.keys(procedures) as P[];
		const input = Object.fromEntries(
			names.map((name, i) => [i, { json: procedures[name] }]),
		);
		const res = this.request(
			"GET",
			`/api/trpc/${names.join(",")}?batch=1&input=${encodeURIComponent(JSON.stringify(input))}`,
			null,
			{ name: `trpc ${names.join(",")}`, flow },
		);
		check(res, { "query 200": (r) => r.status === 200 });
		return res;
	}

	mutation<P extends Procedure>(
		procedure: P,
		input: RouterInputs[P],
		{ flow, expected }: { flow?: string; expected?: number[] } = {},
	) {
		return this.request(
			"POST",
			`/api/trpc/${procedure}?batch=1`,
			JSON.stringify({ 0: { json: input } }),
			{
				name: `trpc ${procedure}`,
				flow,
				headers: { "Content-Type": "application/json" },
				expected,
			},
		);
	}
}

function firstItem(res: Response): TrpcItem | null {
	const body = res.json() as unknown;
	return Array.isArray(body) ? (body[0] as TrpcItem) : null;
}

// Mensagem de erro do tRPC, ou null se a chamada deu certo
export function trpcError(res: Response): string | null {
	try {
		const item = firstItem(res);
		return item?.error ? item.error.json.message : null;
	} catch {
		return `HTTP ${res.status}`;
	}
}

// Motivo tipado do erro (`ACTIVITY_FULL`, `SCHEDULE_CONFLICT`…), ou null
export function trpcReason(res: Response): string | null {
	try {
		return firstItem(res)?.error?.json.data?.reason ?? null;
	} catch {
		return null;
	}
}
