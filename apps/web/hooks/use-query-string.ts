import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Params = Record<string, string | string[] | undefined>;

export function useQueryString() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const toUrl = React.useCallback(
		({ ...parameters }: Params): string => {
			const params = new URLSearchParams(searchParams);

			for (const [key, value] of Object.entries(parameters)) {
				params.delete(key); // Remove existing
				if (Array.isArray(value)) {
					value.forEach(v => params.append(key, v));
				} else if (value) {
					params.set(key, value);
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
