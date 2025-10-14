import type { } from "./auth.d.ts";
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
		// signIn: Gerencia o login do usuário pelo Google
		async signIn({ account, profile }) {
			// console.log("Sign in", { account, profile });

			if (account?.provider === "google") {
				/* const googleProfile = profile as GoogleProfile;
				return googleProfile.email.endsWith(icDomain); */
				return true;
			}

			return false;
		},
		// redirect: Conserva o parâmetro callbackUrl na URL
		redirect({ url, baseUrl }) {
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
		jwt({ token, user, trigger }) {
			// console.log("JWT callback", { trigger, user, token });

			// Atualiza a sessão com os dados do usuário. É triggerado quando o usuário faz login ou atualiza a sessão
			if (trigger === "update" && !!user) {
				token.email = user.email;
				token.sub = user.id;
				token.picture = user.image;
				token.name = user.name;
			}

			// Define a imagem no token durante o signIn
			if (trigger === "signIn" && !!user) {
				token.picture = user.image;
			}

			return token;
		},
		session({ session, token, user, trigger }) {
			// console.log("Session callback", { trigger, user, session, token });

			// Atualiza a sessão com os dados do token. É triggerado quando o usuário faz login ou atualiza a sessão
			// Se o usuário não estiver logado, não faz nada
			if (session.user) {
				const updatedUser = {
					...session.user,
					email: token.email || session.user.email,
					id: token.sub || session.user.id,
					image: token.picture || session.user.image,
					name: token.name || session.user.name,
				};

				session.user = updatedUser;
			}
			// console.log("Updated session", session);

			return session;
		},
		authorized({ auth, request: { nextUrl } }) {
			const isLoggedIn = !!auth?.user;

			console.log("Authorized", { isLoggedIn });

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
