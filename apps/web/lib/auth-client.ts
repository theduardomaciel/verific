"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	// O padrão do better-auth é refazer `getSession` a cada foco de aba.
	// Numa enchente de acessos isso vira um request (e um hit de banco)
	// por aba, de graça: a sessão já é buscada no mount e revalidada
	// após login/logout — trocar de aba não muda o dono da sessão.
	sessionOptions: {
		refetchOnWindowFocus: false,
	},
});
