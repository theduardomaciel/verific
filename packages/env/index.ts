import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {
		NODE_ENV: z.enum(["development", "production", "test"]),
		PROJECT_ID: z.string().min(1),
		DATABASE_URL: z.string().min(1),
		NEXTAUTH_SECRET: z.string().min(1),
		GOOGLE_CLIENT_ID: z.string().min(1),
		GOOGLE_CLIENT_SECRET: z.string().min(1),
		VERCEL_URL: z.string(),
		GOOGLE_SHEET_CLIENT_EMAIL: z.string().min(1),
		GOOGLE_SHEET_PRIVATE_KEY: z.string().min(1),
		PUSHER_APP_ID: z.string().min(1),
		PUSHER_SECRET: z.string().min(1),
		PUSHER_CLUSTER: z.string().min(1),
	},
	client: {
		NEXT_PUBLIC_VERCEL_URL: z.string(),
		NEXT_PUBLIC_PUSHER_KEY: z.string().min(1),
	},
	runtimeEnv: {
		NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
		PROJECT_ID: process.env.PROJECT_ID,
		NODE_ENV: process.env.NODE_ENV,
		VERCEL_URL: process.env.VERCEL_URL,
		DATABASE_URL: process.env.DATABASE_URL,
		NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
		GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
		GOOGLE_SHEET_CLIENT_EMAIL: process.env.GOOGLE_SHEET_CLIENT_EMAIL,
		GOOGLE_SHEET_PRIVATE_KEY: process.env.GOOGLE_SHEET_PRIVATE_KEY,
		PUSHER_APP_ID: process.env.PUSHER_APP_ID,
		NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
		PUSHER_SECRET: process.env.PUSHER_SECRET,
		PUSHER_CLUSTER: process.env.PUSHER_CLUSTER,
	},
	emptyStringAsUndefined: true,
});