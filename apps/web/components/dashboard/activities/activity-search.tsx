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
import { useDebouncedCallback } from "use-debounce";

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
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
				<Input
					placeholder="Pesquisar atividades"
					className="pl-10 w-full"
					defaultValue={defaultQuery}
					onChange={(e) => handleSearch(e.target.value)}
				/>
			</div>
			<Select defaultValue={defaultSort} onValueChange={handleSortChange}>
				<SelectTrigger className="w-full md:w-[180px]">
					<SelectValue placeholder="Ordenar por" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="recent">Mais recentes</SelectItem>
					<SelectItem value="oldest">Mais antigos</SelectItem>
					<SelectItem value="name">Nome</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);
}
