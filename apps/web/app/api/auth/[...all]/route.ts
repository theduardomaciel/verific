import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@verific/auth";

// Registra o revalidator de cache neste runtime: as rotas do better-auth
// (`update-user`, `change-email`, exclusão de conta) mutam `user` fora do
// tRPC e precisam derrubar o cache público do usuário (ver
// `lib/server-cache-invalidation.ts`).
import "@/lib/server-cache-invalidation";

export const { GET, POST } = toNextJsHandler(auth);
