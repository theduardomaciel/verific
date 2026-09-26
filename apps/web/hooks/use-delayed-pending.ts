"use client";

import { useEffect, useState } from "react";

/**
 * Delays a pending flag before exposing it, mirroring TanStack Router's
 * `defaultPendingMs`: skeletons only appear if loading actually takes
 * longer than `delayMs`.
 *
 * Warm navigations (fresh cache, hover-prefetched detail) resolve in well
 * under the delay, so the content renders directly with no skeleton flash.
 * Cold loads past the delay behave exactly as before.
 */
export function useDelayedPending(isPending: boolean, delayMs = 300) {
	const [show, setShow] = useState(false);

	useEffect(() => {
		if (!isPending) {
			setShow(false);
			return;
		}
		const timer = setTimeout(() => setShow(true), delayMs);
		return () => clearTimeout(timer);
	}, [isPending, delayMs]);

	return show;
}
