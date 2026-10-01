import {
	defaultShouldDehydrateQuery,
	QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

// tRPC errors carry the HTTP status at `error.data.httpStatus`
// (TRPCClientError shape). Deterministic failures (bad input, auth,
// permission, not found, validation) always fail the same way, so fail
// fast instead of tripling the error noise. Anything else
// (network/CORS, 5xx) is transient: retry twice with the default backoff.
function getHttpStatus(error: unknown): number | undefined {
	if (typeof error !== "object" || error === null) return undefined;
	const data = (error as { data?: unknown }).data;
	if (typeof data !== "object" || data === null) return undefined;
	const status = (data as { httpStatus?: unknown }).httpStatus;
	return typeof status === "number" ? status : undefined;
}

function shouldRetry(failureCount: number, error: unknown) {
	const status = getHttpStatus(error);
	if (
		status === 400 ||
		status === 401 ||
		status === 403 ||
		status === 404 ||
		status === 422
	) {
		return false;
	}
	return failureCount < 2;
}

export const createQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				// Errors are data: screens render them inline via the
				// `isError` field, never as thrown exceptions.
				throwOnError: false,
				retry: shouldRetry,
				// With SSR, we usually want to set some default staleTime
				// above 0 to avoid refetching immediately on the client
				staleTime: 30 * 1000,
				// Refetching every list on window focus causes error-toast
				// storms after a backend blip; refetch explicitly instead.
				refetchOnWindowFocus: false,
			},
			dehydrate: {
				serializeData: SuperJSON.serialize,
				shouldDehydrateQuery: (query) =>
					defaultShouldDehydrateQuery(query) ||
					query.state.status === "pending",
				shouldRedactErrors: () => {
					// We should not catch Next.js server errors
					// as that's how Next.js detects dynamic pages
					// so we cannot redact them.
					// Next.js also automatically redacts errors for us
					// with better digests.
					return false;
				},
			},
			hydrate: {
				deserializeData: SuperJSON.deserialize,
			},
		},
	});
