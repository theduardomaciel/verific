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
		// Os testes de contrato importam o `appRouter` completo, e a cadeia
		// (`trpc.ts` → registro de invalidação → `@verific/drizzle` /
		// notificações → `@verific/env`) valida o ambiente já no import.
		// Os testes deste pacote são unitários e nunca abrem conexão nem
		// chamam serviços: estes placeholders (os mesmos do CI) só
		// satisfazem a validação de import (o `Pool` do Neon é preguiçoso,
		// não conecta sem query).
		env: {
			VERCEL_URL: "ci.example.com",
			DATABASE_URL:
				process.env.DATABASE_URL ??
				"postgresql://user:password@localhost:5432/verific_test",
			BETTER_AUTH_SECRET: "ci-placeholder-secret-that-is-long-enough",
			BETTER_AUTH_URL: "http://localhost:3000",
			GOOGLE_CLIENT_ID: "ci-placeholder-client-id",
			GOOGLE_CLIENT_SECRET: "ci-placeholder-client-secret",
			NEXT_PUBLIC_APP_URL: "http://localhost:3000",
			NEXT_PUBLIC_VERCEL_URL: "http://localhost:3000",
		},
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
