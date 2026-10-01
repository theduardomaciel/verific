"use client";

import { useSearchParams } from "next/navigation";

function searchParamsToObject(searchParams: URLSearchParams) {
	const obj: Record<string, string | string[] | undefined> = {};

	for (const key of new Set(searchParams.keys())) {
		const values = searchParams.getAll(key);
		obj[key] = values.length > 1 ? values : values[0];
	}

	return obj;
}

export function useParsedSearchParams<T>(parse: (raw: unknown) => T): T {
	const searchParams = useSearchParams();

	return parse(searchParamsToObject(searchParams));
}
