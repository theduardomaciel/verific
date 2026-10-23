/**
 * Ponte de invalidação para mutations que NÃO passam pelo tRPC.
 *
 * O better-auth muta a tabela `user` (nome/avatar/e-mail) por suas próprias
 * rotas (`/api/auth/update-user`, `.../change-email`, e — se habilitado —
 * exclusão de conta). Essas colunas aparecem em páginas públicas cacheadas
 * (`events`/`profiles` em `@verific/api`), então essas escritas também
 * precisam derrubar o cache.
 *
 * Este módulo é **puro** (nenhum import de better-auth/Next): o app registra
 * aqui o `revalidateTag` do Next e `auth.config.ts` dispara nos
 * `databaseHooks` de `user`. Assim o import de `next/cache` continua fora
 * dos pacotes de backend, e o registro pode ser testado isoladamente.
 */

export type AuthUserChangeReason = "update" | "delete";

export type AuthUserChange = {
	reason: AuthUserChangeReason;
	/** Id do usuário alterado, quando o hook o fornece. */
	userId: string | null;
};

export type AuthUserChangeListener = (
	change: AuthUserChange,
) => void | Promise<void>;

/**
 * Endpoints do better-auth que só existem para o usuário MUDAR a própria
 * identidade (nome/avatar/e-mail) ou apagar a conta.
 *
 * Escrever a linha `user` acontece também em fluxos internos de login
 * (marcar `emailVerified` no primeiro acesso, sincronizar nome/avatar do
 * provedor no vínculo de conta). Esses NÃO são edições do usuário e, se
 * invalidassem o cache público, cada cadastro novo derrubaria `events`/
 * `profiles` de todo mundo durante o pico — exatamente o que a cache longa
 * existe para evitar. Por isso o hook só dispara nesses caminhos.
 */
export const AUTH_IDENTITY_ENDPOINTS: readonly string[] = [
	"/update-user",
	"/change-email",
	"/delete-user",
];

/** Aceita o caminho do endpoint com ou sem o prefixo do `baseURL`. */
export function isAuthIdentityEndpoint(path: string | null | undefined) {
	if (typeof path !== "string" || path.length === 0) return false;
	const clean = path.split("?")[0] ?? path;
	return AUTH_IDENTITY_ENDPOINTS.some(
		(endpoint) => clean === endpoint || clean.endsWith(endpoint),
	);
}

const listeners = new Set<AuthUserChangeListener>();

/** Registra um ouvinte (chamado uma única vez pelo app, no boot do handler). */
export function onAuthUserChanged(listener: AuthUserChangeListener) {
	listeners.add(listener);
}

/** Remove um ouvinte (testes). */
export function offAuthUserChanged(listener: AuthUserChangeListener) {
	listeners.delete(listener);
}

/**
 * Publica uma mudança de usuário. Nunca pode derrubar a mutation do
 * better-auth: qualquer erro de um ouvinte é engolido (o cache fica
 * momentaneamente velho, o login/fluxo de conta não quebra).
 */
export async function emitAuthUserChanged(change: AuthUserChange) {
	await Promise.allSettled(
		[...listeners].map(async (listener) => listener(change)),
	);
}
