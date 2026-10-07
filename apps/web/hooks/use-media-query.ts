import * as React from "react";

export function useMediaQuery(query: string) {
	const subscribe = React.useCallback(
		(onStoreChange: () => void) => {
			const result = matchMedia(query);
			result.addEventListener("change", onStoreChange);
			return () => result.removeEventListener("change", onStoreChange);
		},
		[query],
	);
	const getSnapshot = React.useCallback(
		() => matchMedia(query).matches,
		[query],
	);
	const getServerSnapshot = () => false;

	return React.useSyncExternalStore(
		subscribe,
		getSnapshot,
		getServerSnapshot,
	);
}
