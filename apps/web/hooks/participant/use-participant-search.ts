"use client";

import { useState } from "react";

import { useDebounce } from "@/hooks/use-debounce";
import { trpc } from "@/lib/trpc/react";

interface UseParticipantSearchProps {
	projectId: string;
	isOpen: boolean;
	/**
	 * Busca do credenciamento manual (`searchCheckInCandidates`), liberada
	 * também para monitores da atividade informada. Sem isso, usa a lista
	 * da equipe (`getParticipants`).
	 */
	checkIn?: { activityId?: string };
}

const PAGE_SIZE = 20;

// Sem permissão, repetir a chamada não muda a resposta
function retryUnlessForbidden(
	failureCount: number,
	error: { data?: { code?: string } | null },
) {
	return error.data?.code !== "FORBIDDEN" && failureCount < 1;
}

export function useParticipantSearch({
	projectId,
	isOpen,
	checkIn,
}: UseParticipantSearchProps) {
	const [page, setPage] = useState(0);
	const [search, setSearch] = useState("");
	const [hasMore, setHasMore] = useState(true);

	const debouncedSearch = useDebounce(search, 750);
	const isDebouncing = search !== debouncedSearch;

	const options = {
		staleTime: 1000 * 30, // 30 seconds
		retry: retryUnlessForbidden,
	};
	const teamQuery = trpc.getParticipants.useQuery(
		{
			projectId,
			// `getParticipants` pagina a partir de 1
			page: page + 1,
			pageSize: PAGE_SIZE,
			query: debouncedSearch,
			sort: "name_asc",
		},
		{ ...options, enabled: isOpen && !checkIn },
	);
	const checkInQuery = trpc.searchCheckInCandidates.useQuery(
		{
			projectId,
			activityId: checkIn?.activityId,
			page,
			pageSize: PAGE_SIZE,
			query: debouncedSearch || undefined,
		},
		{ ...options, enabled: isOpen && !!checkIn },
	);
	const { data, isFetching, isError, refetch } = checkIn
		? checkInQuery
		: teamQuery;
	// Derivado da consulta: um resultado vindo do cache não deixa o
	// indicador preso
	const isSearching = isDebouncing || (isFetching && page === 0);

	// Reseta a paginação quando a busca ou a visibilidade mudam. Os sets
	// puros ficam na renderização (sem cascata).
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
		}
	}

	return {
		page,
		setPage,
		search,
		setSearch,
		hasMore,
		setHasMore,
		isSearching,
		debouncedSearch,
		isDebouncing,
		data,
		isFetching,
		isError,
		refetch,
	};
}
