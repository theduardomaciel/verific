import type {} from "./auth.d.ts";
import { db } from "@verific/drizzle";

import { drizzleAuthAdapter } from "./drizzle-auth-adapter";
import { googleProvider } from "./google-provider";

// Types
import type { Session, NextAuthConfig } from "next-auth";
import type { GoogleProfile } from "next-auth/providers/google";

const icDomain = "@ic.ufal.br";

export const authConfig = {
	adapter: drizzleAuthAdapter,
	providers: [googleProvider],
	pages: {
		signIn: "/auth",
		error: "/auth/error",
	},
	// debug: true,
	session: {
		strategy: "jwt",
		updateAge: 60 * 60 * 24, // 24 hours
	},
	callbacks: {
		async signIn({ account, profile }) {
			// console.log("Sign in", { account, profile });

			if (account?.provider === "google") {
				/* const googleProfile = profile as GoogleProfile;
				return googleProfile.email.endsWith(icDomain); */
				return true;
			}

			return false;
		},
		redirect({ url, baseUrl }) {
			// Previne que usuários não administrados não vejam a mensagem de erro, por exemplo
			// Sem isso, o callbackUrl embutido em todas as URLs redirecionaria para a página de login novamente

			const isRelativeUrl = url.startsWith("/");
			if (isRelativeUrl) {
				return `${baseUrl}${url}`;
			}

			const isSameOriginUrl = new URL(url).origin === baseUrl;
			const alreadyRedirected = url.includes("callbackUrl=");
			if (isSameOriginUrl && alreadyRedirected) {
				const originalCallbackUrl = decodeURIComponent(
					url.split("callbackUrl=")[1] ?? "",
				);

				return originalCallbackUrl;
			}

			if (isSameOriginUrl) {
				return url;
			} else {
				return baseUrl;
			}
		},
		async jwt({ token, user, session, trigger }) {
			if (user && token.participant && token.participant.projectId) {
				const projectId = token.participant.projectId;

				const participant = await db.query.participant.findFirst({
					where: (dbMember, { eq, and }) =>
						and(
							eq(dbMember.userId, user.id as string),
							eq(dbMember.projectId, projectId),
						),
				});

				// console.log("participant", participant);
				// console.log("userId", user.id);

				if (participant) {
					console.log("JWT Member found");
					token.participant = participant;
				}

				// console.log("JWT User found", user);
			}

			function isSessionAvailable(session: unknown): session is Session {
				return !!session;
			}

			if (trigger === "update" && isSessionAvailable(session)) {
				console.log("Session available", session);
				token.name = session.user?.name;
				token.participant = session.participant;
			}

			/* console.log("JWT", {
				token,
				user,
				session,
				trigger,
			}); */

			return token;
		},
		session({ session, token, ...params }) {
			/* console.log("Session", {
				session,
				token,
				params,
			}); */

			if (session.user) {
				session.user.id = token.sub as string;
			}
			if (token.participant) {
				session.participant = token.participant;
			}

			// console.log("Updated session", session);

			return session;
		},
		authorized({ auth, request: { nextUrl } }) {
			const isLoggedIn = !!auth?.user;
			const isMember = !!auth?.participant;

			console.log("Authorized", { isLoggedIn, isMember });
			// console.log("Pathname", nextUrl.pathname);

			const authenticatedRoutes = ["/dashboard", "/account"];

			const isOnAuthenticatedRoutes = authenticatedRoutes.some((route) =>
				nextUrl.pathname.startsWith(route),
			);

			const isOnPublicAPIRoutes =
				nextUrl.pathname.startsWith("/api/auth");
			const isOnAPIRoutes = nextUrl.pathname.startsWith("/api");

			if (isOnPublicAPIRoutes) {
				// console.log("Public API route");
				return true;
			}

			if (isOnAPIRoutes && !isLoggedIn) {
				// console.log("User not logged. Preventing API access");
				return Response.json(
					{ message: "Unauthorized." },
					{ status: 401 },
				);
			}

			// Usuário está logado e acessando a página de login
			if (isLoggedIn && nextUrl.pathname.includes("/auth")) {
				// console.log("User logged. Redirecting to account page");
				return Response.redirect(new URL("/account", nextUrl));
			}

			// Usuário não está logado e acessando uma página autenticada
			if (isOnAuthenticatedRoutes && !isLoggedIn) {
				// console.log("User not logged. Redirecting to login");
				return false;
			}

			return true;
		},
	},
} satisfies NextAuthConfig;
