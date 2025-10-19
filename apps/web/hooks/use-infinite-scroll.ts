"use client";

import { useEffect, useRef } from "react";

interface UseInfiniteScrollProps {
    isFetching: boolean;
    isSearching: boolean;
    hasMore: boolean;
    allParticipantsLength: number;
    setPage: (fn: (prev: number) => number) => void;
}

export function useInfiniteScroll({
    isFetching,
    isSearching,
    hasMore,
    allParticipantsLength,
    setPage,
}: UseInfiniteScrollProps) {
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (
                    entry &&
                    entry.isIntersecting &&
                    !isFetching &&
                    !isSearching &&
                    hasMore &&
                    allParticipantsLength > 0
                ) {
                    setPage((prev) => prev + 1);
                }
            },
            { threshold: 0.1 },
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [isFetching, isSearching, hasMore, allParticipantsLength, setPage]);

    return observerTarget;
}