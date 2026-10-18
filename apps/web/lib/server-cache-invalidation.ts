import "server-only";
import { revalidateTag } from "next/cache";

import {
	invalidateAuthUserChange,
	registerCacheRevalidator,
} from "@verific/api";
import { onAuthUserChanged } from "@verific/auth";

/**
 * Boot da invalidação de cache pública — **único** lugar que liga o
 * `revalidateTag` do Next às mutations.
 *
 * Módulo de efeito de import (`server-only`), importado por TODO runtime que
 * executa uma mutation:
 *
 * - `app/api/trpc/[trpc]/route.ts` — mutations do tRPC (middleware em
 *   `@verific/api/trpc` chama `invalidateCacheTags`);
 * - `app/api/auth/[...all]/route.ts` — mutations do better-auth
 *   (nome/avatar/e-mail do usuário), via `onAuthUserChanged`;
 * - `lib/trpc/server.ts` — caller de servidor (rede de segurança caso um
 *   dia exista mutation fora do handler HTTP).
 *
 * O `revalidateTag` importado aqui é o do runtime Next em execução: por
 * isso ele NÃO vive em `packages/api` (o pacote tem o seu próprio `next`).
 * Registrar é idempotente; se um bundle duplicar o módulo, cada cópia
 * registra a sua — todas apontam para o mesmo `revalidateTag`.
 */
registerCacheRevalidator((tag) => revalidateTag(tag, "max"));

// Escritas de identidade do usuário pelo better-auth (fora do tRPC) mudam
// `user.name`/`user.image_url`, expostos em páginas públicas cacheadas.
onAuthUserChanged(() => invalidateAuthUserChange());
