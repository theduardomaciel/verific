import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {
		NODE_ENV: z.enum(["development", "production", "test"]),
		VERCEL_URL: z.string(),
		DATABASE_URL: z.string().min(1),
		NEXTAUTH_SECRET: z.string().min(1),
		GOOGLE_CLIENT_ID: z.string().min(1),
		GOOGLE_CLIENT_SECRET: z.string().min(1),
	},
	client: {
		NEXT_PUBLIC_VERCEL_URL: z.string(),
	},
	runtimeEnv: {
		NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
		NODE_ENV: process.env.NODE_ENV,
		VERCEL_URL: process.env.VERCEL_URL,
		DATABASE_URL: process.env.DATABASE_URL,
		NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
		GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
	},
	emptyStringAsUndefined: true,
});
