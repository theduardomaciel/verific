import { auth } from "@verific/auth";
import { appRouter } from "@verific/api";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest, NextResponse } from "next/server";

const handler = async (req: NextRequest) => {
	const response = await fetchRequestHandler({
		endpoint: "/api/trpc",
		req,
		router: appRouter,
		createContext: async () => {
			const session = await auth();

			return {
				session,
			};
		},
	});

	return new NextResponse(response.body, {
		headers: response.headers,
		status: response.status,
		statusText: response.statusText,
	});
};

export const runtime = "edge";
export const preferredRegion = "cle1";
export { handler as GET, handler as POST };
