import { createEnv } from "@t3-oss/env-nextjs";

import { z } from "@verific/zod";

export const env = createEnv({
	server: {
		NODE_ENV: z.enum(["development", "production", "test"]),
		VERCEL_URL: z.string(),
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.string().url(),
		GOOGLE_CLIENT_ID: z.string().min(1).optional(),
		GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
		S3_ENDPOINT: z.string().url().optional(),
		S3_REGION: z.string().min(1).optional(),
		S3_BUCKET: z.string().min(1).optional(),
		S3_ACCESS_KEY_ID: z.string().min(1).optional(),
		S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
		S3_PUBLIC_BASE_URL: z.string().url().optional(),
		S3_FORCE_PATH_STYLE: z.coerce.boolean().optional(),
		// Central email notification service. Everything stays optional here so
		// importing env never fails for an unselected provider; the
		// notifications module enforces per-provider requirements at runtime
		// (see @verific/api notifications/config).
		EMAIL_PROVIDER: z.enum(["console", "ses", "resend"]).optional(),
		EMAIL_FROM: z.string().min(1).optional(),
		EMAIL_DAILY_LIMIT: z.coerce.number().int().positive().optional(),
		SES_REGION: z.string().min(1).optional(),
		AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
		AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
		RESEND_API_KEY: z.string().min(1).optional(),
		// Scheduler for waitlist offer expiry (exact deadlines via QStash).
		QSTASH_TOKEN: z.string().min(1).optional(),
		QSTASH_CURRENT_SIGNING_KEY: z.string().min(1).optional(),
		QSTASH_NEXT_SIGNING_KEY: z.string().min(1).optional(),
		QSTASH_URL: z.string().url().optional(),
		CRON_SECRET: z.string().min(32).optional(),
		SCHEDULER_PROVIDER: z.enum(["console", "qstash"]).optional(),
		// IPs/faixas IPv4 (CIDR) separados por vírgula, com limites maiores
		RATE_LIMIT_RELAXED_CIDRS: z.string().optional(),
	},
	client: {
		NEXT_PUBLIC_APP_URL: z.url(),
		NEXT_PUBLIC_VERCEL_URL: z.string(),
		NEXT_PUBLIC_STORAGE_BASE_URL: z.string().url().optional(),
	},
	runtimeEnv: {
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
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
		EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
		EMAIL_FROM: process.env.EMAIL_FROM,
		EMAIL_DAILY_LIMIT: process.env.EMAIL_DAILY_LIMIT,
		SES_REGION: process.env.SES_REGION,
		AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
		AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
		RESEND_API_KEY: process.env.RESEND_API_KEY,
		QSTASH_TOKEN: process.env.QSTASH_TOKEN,
		QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY,
		QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY,
		QSTASH_URL: process.env.QSTASH_URL,
		CRON_SECRET: process.env.CRON_SECRET,
		SCHEDULER_PROVIDER: process.env.SCHEDULER_PROVIDER,
		RATE_LIMIT_RELAXED_CIDRS: process.env.RATE_LIMIT_RELAXED_CIDRS,
	},
	emptyStringAsUndefined: true,
});

export const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
