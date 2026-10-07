import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		// Node by default so pure unit tests stay out of jsdom.
		// Component tests opt into jsdom with a
		// `// @vitest-environment jsdom` pragma at the top of the file.
		environment: "node",
		setupFiles: ["./vitest.setup.ts"],
		include: ["**/*.test.{ts,tsx}"],
		exclude: ["node_modules", ".next"],
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov", "html"],
			include: [
				"lib/**/*.{ts,tsx}",
				"components/**/*.{ts,tsx}",
				"hooks/**/*.{ts,tsx}",
			],
			exclude: [
				"**/*.test.{ts,tsx}",
				"**/node_modules/**",
				"**/.next/**",
			],
		},
	},
});
