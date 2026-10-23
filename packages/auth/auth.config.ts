import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";

import { db } from "@verific/drizzle";
import { account, session, user, verification } from "@verific/drizzle/schema";
import { env } from "@verific/env";

import { emitAuthUserChanged, isAuthIdentityEndpoint } from "./cache-hooks";

function readUserId(value: unknown): string | null {
	if (typeof value !== "object" || value === null) return null;
	const id = (value as { id?: unknown }).id;
	return typeof id === "string" && id.length > 0 ? id : null;
}

const baseURL = env.BETTER_AUTH_URL.replace(/\/$/, "");
const secret = env.BETTER_AUTH_SECRET;

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user,
			session,
			account,
			verification,
		},
	}),
	secret,
	baseURL,
	trustedOrigins: [baseURL],
	onAPIError: { errorURL: "/auth/error" },
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
			// Sempre exibe o seletor de contas do Google, permitindo
			// trocar de conta mesmo com sessão Google pré-existente.
			prompt: "select_account",
		},
	},
	session: {
		modelName: "session",
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5,
			strategy: "compact",
		},
	},
	account: {
		encryptOAuthTokens: true,
		modelName: "account",
	},
	user: {
		modelName: "user",
		fields: {
			image: "image_url",
		},
		additionalFields: {
			publicEmail: {
				type: "string",
				required: false,
				input: false,
			},
		},
	},
	databaseHooks: {
		user: {
			create: {
				before: async (userData) => ({
					data: {
						...userData,
						publicEmail: userData.email,
					},
				}),
			},
			// Escritas de identidade fora do tRPC (update-user/change-email/
			// exclusão de conta) mudam `user.name`/`user.image_url`, que
			// aparecem em páginas públicas cacheadas. O ouvinte (registrado
			// pelo app em `@/lib/server-cache-invalidation`) derruba as tags
			// `events`/`profiles`. Sem ouvinte registrado, é no-op silencioso.
			//
			// O filtro por endpoint descarta atualizações internas do login
			// (emailVerified / avatar do provedor no vínculo de conta): só
			// edições do próprio usuário justificam derrubar o cache público.
			update: {
				after: async (userData, context) => {
					if (!isAuthIdentityEndpoint(context?.path)) return;
					emitAuthUserChanged({
						reason: "update",
						userId: readUserId(userData),
					});
				},
			},
			delete: {
				after: async (userData) => {
					emitAuthUserChanged({
						reason: "delete",
						userId: readUserId(userData),
					});
				},
			},
		},
	},
	advanced: {
		database: {
			joins: true,
			// Arrow preserva o receiver: `crypto.randomUUID` destacada
			// lança "Illegal invocation" em runtimes WebCrypto (edge).
			generateId: () => crypto.randomUUID(),
		},
		useSecureCookies: env.NODE_ENV === "production",
	},
	plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];
