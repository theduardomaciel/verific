"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { SearchBar } from "../search-bar";
import { SortBy } from "../sort-by";

interface ActivitySearchProps {
	defaultQuery?: string;
	defaultSort?: string;
}

export function ActivitySearch({
	defaultQuery = "",
	defaultSort = "recent",
}: ActivitySearchProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Create a new URLSearchParams instance and update the URL
	const createQueryString = useCallback(
		(name: string, value: string) => {
			const params = new URLSearchParams(searchParams.toString());
			params.set(name, value);

			return params.toString();
		},
		[searchParams],
	);

	// Handle search input with debounce
	const handleSearch = useDebouncedCallback((term: string) => {
		startTransition(() => {
			const queryString = createQueryString("query", term);
			router.push(`/dashboard/activities?${queryString}`);
		});
	}, 300);

	// Handle sort change
	const handleSortChange = (value: string) => {
		startTransition(() => {
			const queryString = createQueryString("sort", value);
			router.push(`/dashboard/activities?${queryString}`);
		});
	};

	return (
		<div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
			<div className="relative w-full md:flex-1">
				<SearchBar placeholder="Pesquisar atividades..." />
			</div>
			<SortBy
				sortBy={searchParams.get("sort") ?? defaultSort}
				items={[
					{ value: "recent", label: "Mais recentes" },
					{ value: "oldest", label: "Mais antigas" },
					{ value: "alphabetical", label: "Alfabética" },
				]}
			/>
		</div>
	);
}
