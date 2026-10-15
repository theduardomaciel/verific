import "server-only";
import { env } from "@verific/env";

export type EmailProviderName = "console" | "ses" | "resend";

export interface EmailConfig {
	provider: EmailProviderName;
	from: string;
	/** Optional cap on sends per rolling 24h. Undefined means uncapped. */
	dailyLimit?: number;
	sesRegion?: string;
	awsAccessKeyId?: string;
	awsSecretAccessKey?: string;
	resendApiKey?: string;
}

export interface RawEmailEnv {
	EMAIL_PROVIDER?: string;
	EMAIL_FROM?: string;
	EMAIL_DAILY_LIMIT?: number | string;
	SES_REGION?: string;
	AWS_ACCESS_KEY_ID?: string;
	AWS_SECRET_ACCESS_KEY?: string;
	RESEND_API_KEY?: string;
	NODE_ENV?: string;
}

/**
 * Pure resolver so the per-provider requirements are unit-testable without
 * touching process env. Only the variables of the selected provider are
 * required; unused providers need nothing. Defaults to console outside
 * production; in production an unset EMAIL_PROVIDER fails loudly.
 */
export function resolveEmailConfig(raw: RawEmailEnv): EmailConfig {
	const nodeEnv = raw.NODE_ENV ?? "development";
	const provider = raw.EMAIL_PROVIDER;
	if (!provider) {
		if (nodeEnv === "production") {
			throw new Error(
				"EMAIL_PROVIDER is not set. Set EMAIL_PROVIDER=console|ses|resend in production.",
			);
		}
		return {
			provider: "console",
			from: requireFrom(raw),
			dailyLimit: parseDailyLimit(raw),
		};
	}
	if (provider !== "console" && provider !== "ses" && provider !== "resend") {
		throw new Error(
			`Invalid EMAIL_PROVIDER="${provider}". Expected console|ses|resend.`,
		);
	}
	const config: EmailConfig = {
		provider,
		from: requireFrom(raw),
		dailyLimit: parseDailyLimit(raw),
	};
	if (provider === "ses") {
		config.sesRegion = requireVar(raw, "SES_REGION");
		config.awsAccessKeyId = requireVar(raw, "AWS_ACCESS_KEY_ID");
		config.awsSecretAccessKey = requireVar(raw, "AWS_SECRET_ACCESS_KEY");
	}
	if (provider === "resend") {
		config.resendApiKey = requireVar(raw, "RESEND_API_KEY");
	}
	return config;
}

/** Reads the validated app env and resolves the active email config. */
export function loadEmailConfig(): EmailConfig {
	return resolveEmailConfig({
		EMAIL_PROVIDER: env.EMAIL_PROVIDER,
		EMAIL_FROM: env.EMAIL_FROM,
		EMAIL_DAILY_LIMIT: env.EMAIL_DAILY_LIMIT,
		SES_REGION: env.SES_REGION,
		AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
		AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
		RESEND_API_KEY: env.RESEND_API_KEY,
		NODE_ENV: env.NODE_ENV,
	});
}

function requireFrom(raw: RawEmailEnv): string {
	const from = raw.EMAIL_FROM?.trim();
	if (!from) {
		throw new Error(
			"EMAIL_FROM is not set. It is required for every email provider.",
		);
	}
	return from;
}

function requireVar(
	raw: RawEmailEnv,
	key:
		| "SES_REGION"
		| "AWS_ACCESS_KEY_ID"
		| "AWS_SECRET_ACCESS_KEY"
		| "RESEND_API_KEY",
): string {
	const value = raw[key]?.trim();
	if (!value) {
		throw new Error(
			`${key} is not set. It is required when EMAIL_PROVIDER=${raw.EMAIL_PROVIDER}.`,
		);
	}
	return value;
}

function parseDailyLimit(raw: RawEmailEnv): number | undefined {
	const value = raw.EMAIL_DAILY_LIMIT;
	if (value === undefined || value === "") return undefined;
	const parsed = typeof value === "number" ? value : Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(
			`Invalid EMAIL_DAILY_LIMIT="${value}". Expected a positive integer.`,
		);
	}
	return parsed;
}
