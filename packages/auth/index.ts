import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import type { Session, User } from "./auth.d"; // Importando os tipos estendidos

export const { auth, signIn, signOut, unstable_update, handlers } =
	NextAuth(authConfig);

// Exportando os tipos estendidos
export type { Session, User }; // Exportando as interfaces estendidas do pacote auth
