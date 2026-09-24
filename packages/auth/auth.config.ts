import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";

import { db } from "@verific/drizzle";
import { account, session, user, verification } from "@verific/drizzle/schema";
import { env } from "@verific/env";

const baseURL = (env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_VERCEL_URL).replace(
	/\/$/,
	"",
);
const secret = env.BETTER_AUTH_SECRET ?? env.NEXTAUTH_SECRET;

if (!secret) {
	throw new Error("BETTER_AUTH_SECRET is required");
}

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			users: user,
			sessions: session,
			accounts: account,
			verification,
		},
	}),
	secret,
	baseURL,
	trustedOrigins: [baseURL],
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
	},
	session: {
		modelName: "sessions",
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
		deferSessionRefresh: true,
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5,
			strategy: "compact",
		},
	},
	account: {
		encryptOAuthTokens: true,
		modelName: "accounts",
		fields: {
			accountId: "providerAccountId",
			providerId: "provider",
		},
	},
	user: {
		modelName: "users",
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
		},
	},
	advanced: {
		database: {
			joins: true,
		},
		useSecureCookies: env.NODE_ENV === "production",
	},
	plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];
