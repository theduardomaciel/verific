// Parâmetros via `k6 run -e NOME=valor`
export const BASE_URL = (__ENV.BASE_URL || "http://localhost:3000").replace(
	/\/$/,
	"",
);

// Como o better-auth: com `https` os cookies levam o prefixo __Secure-
export const COOKIE_PREFIX = BASE_URL.startsWith("https://")
	? "__Secure-better-auth"
	: "better-auth";

// false = nunca reenvia o cookie cache, então toda chamada consulta a tabela de sessões
export const COOKIE_CACHE = (__ENV.COOKIE_CACHE || "true") !== "false";

// Sem valor: cada usuário simula um IP próprio. Com um IP, todos saem por
// ele, como atrás de um NAT; `true` não manda IP (o servidor vê o do k6).
export const SAME_IP = __ENV.SAME_IP || null;

export const PROFILE = __ENV.PROFILE || "smoke";

export const EXTRA_HEADERS: Record<string, string> = __ENV.VERCEL_BYPASS
	? { "x-vercel-protection-bypass": __ENV.VERCEL_BYPASS }
	: {};
