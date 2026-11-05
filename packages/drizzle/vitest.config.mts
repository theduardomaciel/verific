import { defineConfig } from "vitest/config";

// Longe de Brasília e de UTC: o código não pode depender do fuso do processo
process.env.TZ = "Asia/Tokyo";

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
