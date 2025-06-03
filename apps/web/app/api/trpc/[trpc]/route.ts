import { auth } from "@verific/auth";
import { appRouter } from "@verific/api";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

const setCorsHeaders = (res: Response) => {
	res.headers.set("Access-Control-Allow-Origin", "*");
	res.headers.set("Access-Control-Request-Method", "*");
	res.headers.set("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
	res.headers.set("Access-Control-Allow-Headers", "*");
};

export const OPTIONS = () => {
	const response = new Response(null, {
		status: 204,
	});
	setCorsHeaders(response);
	return response;
};

const handler = async (req: NextRequest) => {
	const response = await fetchRequestHandler({
		endpoint: "/api/trpc",
		router: appRouter,
		req,
		createContext: async () => {
			const session = await auth();

			return {
				session,
			};
		},
		onError({ error, path }) {
			console.error(`>>> tRPC Error on '${path}'`, error);
		},
	});

	setCorsHeaders(response);
	return response;
};

// export const runtime = "edge";
// export const preferredRegion = "cle1";
export { handler as GET, handler as POST };
