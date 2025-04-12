import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Params = Record<string, string | undefined>;

export function useQueryString() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const toUrl = React.useCallback(
		({ ...parameters }: Params): string => {
			const params = new URLSearchParams(searchParams);

			for (const [key, value] of Object.entries(parameters)) {
				if (value) {
					params.set(key, value);
				} else {
					params.delete(key);
				}
			}

			return `${pathname}?${params.toString()}`;
		},
		[pathname, searchParams],
	);

	return {
		query: searchParams,
		toUrl,
	};
}
