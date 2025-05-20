import type {} from "./auth.d.ts";

import { env } from "@verific/env";

import { drizzleAuthAdapter } from "./drizzle-auth-adapter";
import { googleProvider } from "./google-provider";

// Types
import type { Session, NextAuthConfig } from "next-auth";
import type { GoogleProfile } from "next-auth/providers/google";
import { db } from "@verific/drizzle";

const icDomain = "@ic.ufal.br";

export const authConfig = {
	adapter: drizzleAuthAdapter,
	providers: [googleProvider],
	pages: {
		signIn: "/auth/sign-in",
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
				const googleProfile = profile as GoogleProfile;

				return googleProfile.email.endsWith(icDomain);
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
					url.split("callbackUrl=")[1],
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
			if (user) {
				const participant = await db.query.participant.findFirst({
					where: (dbMember, { eq, and }) =>
						and(
							eq(dbMember.userId, user.id as string),
							eq(dbMember.projectId, env.PROJECT_ID),
						),
				});

				// console.log("participant", participant);
				// console.log("userId", user.id);

				if (participant) {
					console.log("JWT Member found");
					token.participant = participant;
				}

				console.log("JWT User found", user);
			}

			function isSessionAvailable(session: unknown): session is Session {
				return !!session;
			}

			if (trigger === "update" && isSessionAvailable(session)) {
				token.name = session.user?.name;
				token.participant = session.participant;
			}

			return token;
		},
		session({ session, token, ...params }) {
			if ("token" in params && session.user) {
				session.user.id = token.sub as string;

				if (token.participant) {
					session.participant = token.participant;
				}
			}

			return session;
		},
		authorized({ auth, request: { nextUrl } }) {
			const isLoggedIn = !!auth?.user;
			const isMember = !!auth?.participant?.role;
			const isAdmin = auth?.participant?.role === "moderator";

			console.log("Authorized", { isLoggedIn, isMember, isAdmin });
			// console.log("Pathname", nextUrl.pathname);

			const authenticatedPages = ["/auth"];
			const privatePaths = ["/events/", "/participants/"];
			// A página de eventos é privada somente para eventos específicos (/events/[id]); a página /events é pública

			const isOnPrivatePages = privatePaths.some((page) =>
				nextUrl.pathname.startsWith(page),
			);
			// privatePages.some((page) => nextUrl.pathname === page)
			const isOnAuthenticatedPages = authenticatedPages.some(
				(page) => nextUrl.pathname === page,
			);

			const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");

			const guestPages = ["/auth/sign-in", "/join"];

			const isOnGuestPages = guestPages.some(
				(page) => nextUrl.pathname === page,
			);

			const isOnPublicAPIRoutes =
				nextUrl.pathname.startsWith("/api/auth");
			const isOnAPIRoutes = nextUrl.pathname.startsWith("/api");

			if (isOnPublicAPIRoutes) {
				return true;
			}

			if (isOnAPIRoutes && !isLoggedIn) {
				return Response.json(
					{ message: "Unauthorized." },
					{ status: 401 },
				);
			}

			// Páginas públicas que não devem ser acessadas por membros
			if (isOnGuestPages && isMember) {
				return Response.redirect(new URL("/", nextUrl));
			}

			// Páginas exclusivas para usuários autenticados
			if (isOnAuthenticatedPages && !isLoggedIn) {
				return false;
			}

			// Páginas exclusivas para membros
			if ((isOnPrivatePages || isOnDashboard) && !isMember) {
				if (isLoggedIn) {
					// Redirect user back to sign in
					console.log("Redirecting to sign-in page");
					return Response.redirect(
						new URL("/auth/error?error=NotAuthenticated", nextUrl),
					);
				}

				// Não está autenticado
				return false;
			}

			// Páginas exclusivas para administradores
			if (isOnDashboard && isLoggedIn && !isAdmin) {
				console.log("Redirecting to error page");
				return Response.redirect(
					new URL("/auth/error?error=PermissionLevelError", nextUrl),
				);
			}

			return true;
		},
	},
} satisfies NextAuthConfig;
