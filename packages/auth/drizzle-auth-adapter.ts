import { db } from "@verific/drizzle";
import { account, session, user } from "@verific/drizzle/schema";
import { and, eq, getTableColumns } from "@verific/drizzle/orm";

// Types
import type { Adapter } from "next-auth/adapters";

export const drizzleAuthAdapter: Adapter = {
	async createUser(userToCreate) {
		if (!userToCreate.email || !userToCreate.name) {
			throw new Error("No data to create user.");
		}

		const [drizzleUser] = await db
			.insert(user)
			.values({
				id: crypto.randomUUID(),
				emailVerified: new Date(),
				email: userToCreate.email,
				public_email: userToCreate.email,
				name: userToCreate.name,
				image_url: userToCreate.image,
			})
			.returning();

		if (!drizzleUser) {
			throw new Error("Failed to create user.");
		}

		return drizzleUser;
	},

	async getUser(id) {
		const authUser = await db.query.user.findFirst({
			where: (user, { eq }) => eq(user.id, id),
		});

		if (authUser) {
			return authUser;
		}

		return null;
	},

	async getUserByEmail(email) {
		const authUser = await db.query.user.findFirst({
			where: (user, { eq }) => eq(user.email, email),
		});

		if (authUser) {
			return authUser;
		}

		return null;
	},

	async getUserByAccount({ providerAccountId, provider }) {
		try {
			const [authUser] = await db
				.select({
					user: getTableColumns(user),
				})
				.from(user)
				.innerJoin(account, eq(account.userId, user.id))
				.where(
					and(
						eq(account.provider, provider),
						eq(account.providerAccountId, providerAccountId),
					),
				);

			if (authUser) {
				return authUser.user;
			}
		} catch (error) {
			console.error("getUserByAccount", error);
			return null;
		}

		return null;
	},

	async updateUser({ id, ...userToUpdate }) {
		if (!id || userToUpdate.email || !userToUpdate.name) {
			throw new Error("No data to create user.");
		}

		const [drizzleUser] = await db
			.update(user)
			.set({
				emailVerified: new Date(),
				email: userToUpdate.email,
				name: userToUpdate.name,
				image_url: userToUpdate.image,
			})
			.where(eq(user.id, id))
			.returning();

		if (!drizzleUser) {
			throw new Error("Failed to update user.");
		}

		return drizzleUser;
	},

	async linkAccount(accountToCreate) {
		await db.insert(account).values(accountToCreate);
	},

	async createSession(sessionToCreate) {
		const [drizzleSession] = await db
			.insert(session)
			.values(sessionToCreate)
			.returning();

		if (!drizzleSession) {
			throw new Error("Failed to create session.");
		}

		return drizzleSession;
	},

	async getSessionAndUser(sessionToken) {
		const [drizzleSession] = await db
			.select({
				session: getTableColumns(session),
				user: getTableColumns(user),
			})
			.from(session)
			.innerJoin(user, eq(user.id, session.userId))
			.where(eq(session.sessionToken, sessionToken));

		if (!drizzleSession) {
			throw new Error("Failed to get session.");
		}

		return drizzleSession;
	},

	async updateSession({ sessionToken, ...sessionToUpdate }) {
		const [drizzleSession] = await db
			.update(session)
			.set(sessionToUpdate)
			.where(eq(session.sessionToken, sessionToken))
			.returning();

		return drizzleSession;
	},

	async deleteSession(sessionToken) {
		await db.delete(session).where(eq(session.sessionToken, sessionToken));
	},
};
