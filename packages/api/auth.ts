import { db } from "@verific/drizzle";
import { and, eq } from "@verific/drizzle/orm";

// Types
import type { TRPCError } from "@trpc/server";

interface Props {
	projectId?: string;
	userId?: string;
}

export async function isMemberAuthenticated({ projectId, userId }: Props) {
	let error:
		| {
				message: string;
				code: TRPCError["code"];
		  }
		| undefined;

	if (!userId || !projectId) {
		error = {
			message: "Request user not found.",
			code: "BAD_REQUEST",
		};
		return error;
	}

	const participant = await db.query.participant.findFirst({
		where(fields) {
			return and(
				eq(fields.projectId, projectId),
				eq(fields.userId, userId),
				eq(fields.role, "moderator"),
			);
		},
	});

	if (!participant) {
		error = {
			message: "User has no permission to access this route.",
			code: "FORBIDDEN",
		};
		return error;
	}
}
