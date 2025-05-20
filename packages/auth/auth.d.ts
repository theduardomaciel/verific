import { Role } from "@verific/drizzle/enum/role";

import NextAuth, {
	type DefaultSession,
	type User as DefaultUser,
} from "next-auth";
import type { AdapterUser as AdapterUserBase } from "next-auth/adapters";
import { JWT } from "next-auth/jwt";

interface CustomUser {
	registrationId: string | null;
}

interface Participant {
	id: string;
	projectId: string;
	role: Role;
}

export interface User extends DefaultUser, CustomUser {}

export interface Session extends DefaultSession {
	user: User;
	participant?: Participant;
}

// Extensões para AdapterUser
declare module "next-auth/adapters" {
	interface AdapterUser extends AdapterUserBase, CustomUser {}
}

// Extensões para JWT
declare module "next-auth/jwt" {
	interface JWT {
		participant?: Participant;
	}
}

// Aqui você pode declarar novamente as interfaces, se necessário
declare module "next-auth" {
	export interface Session extends DefaultSession {
		user: User;
		participant?: Participant;
	}
}
