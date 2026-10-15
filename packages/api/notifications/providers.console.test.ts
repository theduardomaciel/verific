import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createConsoleProvider } from "./providers/console";

import type { EmailMessage } from "./types";

const MESSAGE: EmailMessage = {
	to: "user@example.com",
	from: "Verific <nao-responder@example.com>",
	subject: "hello",
	html: "<p>hello</p>",
	text: "hello",
};

const previousNodeEnv = process.env["NODE_ENV"];
afterEach(() => {
	process.env["NODE_ENV"] = previousNodeEnv;
});

describe("console provider", () => {
	it("always succeeds and skips previews outside development", async () => {
		process.env["NODE_ENV"] = "test";
		const dir = await mkdtemp(path.join(tmpdir(), "email-preview-"));
		await rm(dir, { recursive: true, force: true });
		const provider = createConsoleProvider({ previewDir: dir });

		const result = await provider.send(MESSAGE);

		expect(result).toMatchObject({ ok: true });
		if (result.ok) {
			expect(result.providerMessageId).toMatch(/^console-/);
		}
		await expect(readdir(dir)).rejects.toThrow();
	});

	it("writes the html preview in development only", async () => {
		process.env["NODE_ENV"] = "development";
		const dir = await mkdtemp(path.join(tmpdir(), "email-preview-"));
		try {
			const provider = createConsoleProvider({ previewDir: dir });
			await provider.send(MESSAGE);

			const files = await readdir(dir);
			expect(files).toHaveLength(1);
			const body = await readFile(path.join(dir, files[0]!), "utf8");
			expect(body).toContain("<p>hello</p>");
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
