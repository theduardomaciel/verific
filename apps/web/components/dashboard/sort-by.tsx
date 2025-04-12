"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { useQueryString } from "@/hooks/use-query-string";

// Components
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface SortByProps {
	sortBy?: string;
	items: Array<{ value: string; label: string }>;
}

export function SortBy({ sortBy, items }: SortByProps) {
	const router = useRouter();
	const { toUrl } = useQueryString();

	const onValueChange = useCallback(
		(value: string) => {
			router.push(toUrl({ sortBy: value }));
		},
		[router, toUrl],
	);

	return (
		<Select value={sortBy ?? items[0].value} onValueChange={onValueChange}>
			<SelectTrigger className="w-full md:w-[180px]">
				<SelectValue placeholder="Ordenar por" />
			</SelectTrigger>
			<SelectContent>
				{items?.map((item) => (
					<SelectItem key={item.value} value={item.value}>
						{item.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
