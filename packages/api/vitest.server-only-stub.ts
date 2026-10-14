// Test-only stand-in for the `server-only` marker package. The real package
// throws when it cannot prove a React Server Components runtime; under
// vitest there is none, so the alias in vitest.config.mts maps `server-only`
// imports to this empty module instead.
export {};
