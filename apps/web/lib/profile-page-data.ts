import { TRPCError } from "@trpc/server";

/**
 * Política de erro de `getProfilePageData` na página de perfil.
 *
 * O procedimento sinaliza "perfil/participante inexistente" (e evento com
 * perfis desativados) com `TRPCError` de código `NOT_FOUND`. A página só pode
 * converter esse erro em 404: a rota é ISR, então um 404 gerado por falha
 * transitória (timeout de banco, bug) ficaria preso no cache até uma
 * invalidação que talvez nunca venha.
 */

/** `true` apenas para o NOT_FOUND lançado por `getProfilePageData`. */
export function isProfileNotFoundError(error: unknown): boolean {
	if (error instanceof TRPCError) {
		return error.code === "NOT_FOUND";
	}

	// Bundles/duplicatas de `@trpc/server` podem quebrar o `instanceof`;
	// nome + código ainda identificam o erro sem aceitar objetos arbitrários.
	return (
		error instanceof Error &&
		error.name === "TRPCError" &&
		(error as { code?: unknown }).code === "NOT_FOUND"
	);
}

/**
 * Aguarda a leitura do perfil devolvendo `null` **somente** para o erro
 * "não encontrado" — o resto propaga, para o Next não gravar a resposta de
 * erro no ISR. A página decide o 404 (`notFound()`), fora daqui.
 */
export async function resolveProfilePageData<T>(
	load: Promise<T>,
): Promise<T | null> {
	try {
		return await load;
	} catch (error) {
		if (isProfileNotFoundError(error)) {
			return null;
		}

		throw error;
	}
}
