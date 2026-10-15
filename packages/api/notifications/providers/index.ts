import "server-only";
import { loadEmailConfig } from "../config";
import { createConsoleProvider } from "./console";

import type { EmailProviderName } from "../config";
import type { EmailProvider } from "../types";

export type { EmailProvider } from "../types";

/**
 * Resolves the configured provider. SES/Resend adapters are imported lazily
 * so their SDKs (and credentials) are never initialized when unused.
 */
export async function getProvider(
	name?: EmailProviderName,
): Promise<EmailProvider> {
	const config = loadEmailConfig();
	const providerName = name ?? config.provider;
	switch (providerName) {
		case "console":
			return createConsoleProvider();
		case "ses": {
			const { createSesProvider } = await import("./ses");
			return createSesProvider({
				region: config.sesRegion ?? "",
				accessKeyId: config.awsAccessKeyId ?? "",
				secretAccessKey: config.awsSecretAccessKey ?? "",
			});
		}
		case "resend": {
			const { createResendProvider } = await import("./resend");
			return createResendProvider({ apiKey: config.resendApiKey ?? "" });
		}
	}
}
