"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";

interface UseParticipantSearchProps {
    projectId: string;
    isOpen: boolean;
}

export function useParticipantSearch({ projectId, isOpen }: UseParticipantSearchProps) {
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState("");
    const [hasMore, setHasMore] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    const debouncedSearch = useDebounce(search, 750);
    const isDebouncing = search !== debouncedSearch;

    const { data, isFetching, refetch } = trpc.getParticipants.useQuery({
        projectId,
        page,
        pageSize: 20,
        query: debouncedSearch,
        sort: "name_asc",
    }, {
        staleTime: 1000 * 30, // 30 seconds
    });

    // Reset when debouncedSearch changes
    useEffect(() => {
        if (isOpen) {
            setPage(0);
            setHasMore(true);
            setIsSearching(true);
            refetch();
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