import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { EmailMessage, EmailProvider, SendResult } from "../types";

export interface ConsoleProviderOptions {
	/** Defaults to `<cwd>/.email-previews`. Overridable for tests. */
	previewDir?: string;
}

/**
 * Development provider. Logs recipient/subject/text and, only when
 * NODE_ENV=development, writes the HTML to a gitignored `.email-previews/`
 * folder. Always reports success.
 */
export function createConsoleProvider(
	options?: ConsoleProviderOptions,
): EmailProvider {
	return {
		name: "console",
		async send(msg: EmailMessage): Promise<SendResult> {
			console.log(
				`[email:console] to=${msg.to} from=${msg.from} subject=${msg.subject}\n${msg.text}`,
			);
			if (process.env["NODE_ENV"] === "development") {
				try {
					await writePreview(msg, options?.previewDir);
				} catch {
					// Preview output must never fail a send.
				}
			}
			return { ok: true, providerMessageId: `console-${randomUUID()}` };
		},
	};
}

async function writePreview(
	msg: EmailMessage,
	previewDir?: string,
): Promise<void> {
	const dir = previewDir ?? path.join(process.cwd(), ".email-previews");
	await mkdir(dir, { recursive: true });
	const safe = `${Date.now()}-${msg.to.replaceAll(/[^a-zA-Z0-9@._-]/g, "_")}-${randomUUID().slice(0, 8)}.html`;
	const body = `<!-- to: ${msg.to}\nsubject: ${msg.subject} -->\n${msg.html}`;
	await writeFile(path.join(dir, safe), body, "utf8");
}
