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

	if (!userId) {
		error = {
			message: "Request user not found.",
			code: "BAD_REQUEST",
		};
		return error;
	}
}
