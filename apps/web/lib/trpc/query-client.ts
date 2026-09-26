import {
	defaultShouldDehydrateQuery,
	keepPreviousData,
	QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

// tRPC errors carry the HTTP status at `error.data.httpStatus`
// (TRPCClientError shape). Auth/permission failures (401/403/404/422)
// always fail the same way, so fail fast instead of tripling the error
// noise. Anything else (network/CORS, 5xx) is transient: retry twice
// with the default backoff.
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
				// Instant navigation: keep pages cached so back/forward and
				// revisited routes render immediately without a loading state.
				// Fresh cache -> no refetch. Stale cache -> instant render +
				// background refetch (no skeleton flash).
				staleTime: 5 * 60 * 1000,
				gcTime: 30 * 60 * 1000,
				// Keep previous list visible while paginating / filtering
				// instead of flashing a full-page skeleton.
				placeholderData: keepPreviousData,
				// Refetching every list on window focus causes error-toast
				// storms after a backend blip; refetch explicitly instead.
				refetchOnWindowFocus: false,
				refetchOnReconnect: false,
			},
			mutations: {
				// Never auto-retry mutations: a retried write can execute
				// twice (duplicate activity / enrollment).
				retry: false,
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
