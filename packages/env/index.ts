import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "@verific/zod";

export const env = createEnv({
	server: {
		NODE_ENV: z.enum(["development", "production", "test"]),
		VERCEL_URL: z.string(),
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.string().url(),
		GOOGLE_CLIENT_ID: z.string().min(1),
		GOOGLE_CLIENT_SECRET: z.string().min(1),
		S3_ENDPOINT: z.string().url().optional(),
		S3_REGION: z.string().min(1).optional(),
		S3_BUCKET: z.string().min(1).optional(),
		S3_ACCESS_KEY_ID: z.string().min(1).optional(),
		S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
		S3_PUBLIC_BASE_URL: z.string().url().optional(),
		S3_FORCE_PATH_STYLE: z.coerce.boolean().optional(),
	},
	client: {
		NEXT_PUBLIC_VERCEL_URL: z.string(),
		NEXT_PUBLIC_STORAGE_BASE_URL: z.string().url().optional(),
	},
	runtimeEnv: {
		NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
		NEXT_PUBLIC_STORAGE_BASE_URL: process.env.NEXT_PUBLIC_STORAGE_BASE_URL,
		NODE_ENV: process.env.NODE_ENV,
		VERCEL_URL: process.env.VERCEL_URL,
		DATABASE_URL: process.env.DATABASE_URL,
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
		BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
		GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
		S3_ENDPOINT: process.env.S3_ENDPOINT,
		S3_REGION: process.env.S3_REGION,
		S3_BUCKET: process.env.S3_BUCKET,
		S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
		S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
		S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL,
		S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
	},
	emptyStringAsUndefined: true,
});
