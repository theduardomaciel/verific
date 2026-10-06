"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";

interface UseParticipantSearchProps {
	projectId: string;
	isOpen: boolean;
}

export function useParticipantSearch({
	projectId,
	isOpen,
}: UseParticipantSearchProps) {
	const [page, setPage] = useState(0);
	const [search, setSearch] = useState("");
	const [hasMore, setHasMore] = useState(true);
	const [isSearching, setIsSearching] = useState(false);

	const debouncedSearch = useDebounce(search, 750);
	const isDebouncing = search !== debouncedSearch;

	const { data, isFetching, refetch } = trpc.getParticipants.useQuery(
		{
			projectId,
			page,
			pageSize: 20,
			query: debouncedSearch,
			sort: "name_asc",
		},
		{
			staleTime: 1000 * 30, // 30 seconds
		},
	);

	// Reseta a paginação quando a busca ou a visibilidade mudam. Os sets
	// puros ficam na renderização (sem cascata); o refetch é efeito
	// colateral e permanece no efeito abaixo.
	const [prevSearchReset, setPrevSearchReset] = useState({
		debouncedSearch,
		isOpen,
	});
	if (
		debouncedSearch !== prevSearchReset.debouncedSearch ||
		isOpen !== prevSearchReset.isOpen
	) {
		setPrevSearchReset({ debouncedSearch, isOpen });
		if (isOpen) {
			setPage(0);
			setHasMore(true);
			setIsSearching(true);
		}
	}

	useEffect(() => {
		if (isOpen) {
			void refetch();
		}
	}, [debouncedSearch, isOpen, refetch]);

	return {
		page,
		setPage,
		search,
		setSearch,
		hasMore,
		setHasMore,
		isSearching,
		setIsSearching,
		debouncedSearch,
		isDebouncing,
		data,
		isFetching,
		refetch,
	};
}
