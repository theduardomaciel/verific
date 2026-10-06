import { defineConfig } from "vitest/config";

export default defineConfig({
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
