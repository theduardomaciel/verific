import { describe, expect, it, vi } from "vitest";

vi.mock("@verific/env", () => ({ env: {} }));

import { resolveEmailConfig } from "./config";

import type { RawEmailEnv } from "./config";

const BASE: RawEmailEnv = {
	EMAIL_FROM: "Verific <nao-responder@example.com>",
	NODE_ENV: "development",
};

describe("resolveEmailConfig", () => {
	it("defaults to console outside production", () => {
		expect(resolveEmailConfig({ ...BASE })).toMatchObject({
			provider: "console",
		});
		expect(resolveEmailConfig({ ...BASE, NODE_ENV: "test" }).provider).toBe(
			"console",
		);
	});

	it("fails loudly in production when EMAIL_PROVIDER is unset", () => {
		expect(() =>
			resolveEmailConfig({ ...BASE, NODE_ENV: "production" }),
		).toThrow(/EMAIL_PROVIDER/);
	});

	it("rejects an unknown provider", () => {
		expect(() =>
			resolveEmailConfig({ ...BASE, EMAIL_PROVIDER: "smtp" }),
		).toThrow(/Invalid EMAIL_PROVIDER/);
	});

	it("requires EMAIL_FROM for every provider", () => {
		expect(() =>
			resolveEmailConfig({
				NODE_ENV: "development",
				EMAIL_PROVIDER: "ses",
			}),
		).toThrow(/EMAIL_FROM/);
	});

	it("console needs nothing else", () => {
		expect(
			resolveEmailConfig({ ...BASE, EMAIL_PROVIDER: "console" }),
		).toMatchObject({ provider: "console", dailyLimit: undefined });
	});

	it("ses requires only the ses variables", () => {
		expect(() =>
			resolveEmailConfig({ ...BASE, EMAIL_PROVIDER: "ses" }),
		).toThrow(/SES_REGION/);
		const config = resolveEmailConfig({
			...BASE,
			EMAIL_PROVIDER: "ses",
			SES_REGION: "us-east-1",
			AWS_ACCESS_KEY_ID: "akid",
			AWS_SECRET_ACCESS_KEY: "secret",
		});
		expect(config).toMatchObject({
			provider: "ses",
			sesRegion: "us-east-1",
		});
	});

	it("resend requires only the resend variable", () => {
		expect(() =>
			resolveEmailConfig({ ...BASE, EMAIL_PROVIDER: "resend" }),
		).toThrow(/RESEND_API_KEY/);
		const config = resolveEmailConfig({
			...BASE,
			EMAIL_PROVIDER: "resend",
			RESEND_API_KEY: "re_test",
		});
		expect(config).toMatchObject({
			provider: "resend",
			resendApiKey: "re_test",
		});
	});

	it("parses and validates the daily limit", () => {
		expect(
			resolveEmailConfig({ ...BASE, EMAIL_DAILY_LIMIT: 100 }).dailyLimit,
		).toBe(100);
		expect(
			resolveEmailConfig({ ...BASE, EMAIL_DAILY_LIMIT: "50" }).dailyLimit,
		).toBe(50);
		for (const invalid of ["0", "-1", "abc", 1.5]) {
			expect(() =>
				resolveEmailConfig({
					...BASE,
					EMAIL_DAILY_LIMIT: invalid as number,
				}),
			).toThrow(/EMAIL_DAILY_LIMIT/);
		}
	});

	it("does not leak unused provider secrets into the resolved config", () => {
		const config = resolveEmailConfig({
			...BASE,
			EMAIL_PROVIDER: "console",
			AWS_SECRET_ACCESS_KEY: "unused",
			RESEND_API_KEY: "unused",
		});
		expect(config.awsSecretAccessKey).toBeUndefined();
		expect(config.resendApiKey).toBeUndefined();
	});
});
