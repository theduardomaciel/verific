// Test-only stand-in for `next/server`'s `after()`. There is no Next.js
// request scope under vitest, so `after` runs the task inline instead of
// deferring it past the response. Per-file `vi.mock("next/server", ...)`
// can override this when a test needs a different behavior.
export function after(task: () => unknown): void {
	void task();
}
