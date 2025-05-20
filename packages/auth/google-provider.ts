import { env } from "@verific/env";
import GoogleProvider from "next-auth/providers/google";

export const googleProvider = GoogleProvider({
	clientId: env.GOOGLE_CLIENT_ID,
	clientSecret: env.GOOGLE_CLIENT_SECRET,
	allowDangerousEmailAccountLinking: true,
	authorization: {
		params: {
			prompt: "consent",
			access_type: "offline",
			response_type: "code",
		},
	},
});
