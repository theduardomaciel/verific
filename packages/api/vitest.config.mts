import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			// `server-only` throws outside React Server Components. Tests run
			// in plain Node, so map the marker import to an empty module.
			"server-only": fileURLToPath(
				new URL("./vitest.server-only-stub.ts", import.meta.url),
			),
			// `next/server` is provided by the Next.js runtime, not installed
			// as a dependency of this package. Tests map it to a stub whose
			// `after()` runs the task inline (no request scope under vitest).
			"next/server": fileURLToPath(
				new URL("./vitest.next-server-stub.ts", import.meta.url),
			),
		},
	},
	test: {
		environment: "node",
		include: ["**/*.test.{ts,tsx}"],
		exclude: ["node_modules"],
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov", "html"],
			include: ["**/*.{ts,tsx}"],
			exclude: ["**/*.test.{ts,tsx}", "**/node_modules/**"],
		},
	},
});
