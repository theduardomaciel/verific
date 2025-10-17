"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { nativeClient } from "@/lib/trpc/client";

import { categorizeByDate } from "@/lib/date";

import { ActivityCard } from "./activity-card";
import { Empty } from "../empty";

import { cn } from "@/lib/utils";

import type { z } from "zod";
import { getActivitiesParams } from "@verific/api/routers/activities";
import { LoaderCircle } from "lucide-react";

type Props = {
	initialActivities: any[];
	event: any;
	searchParams: z.infer<typeof getActivitiesParams>;
	sort: string;
	userId?: string;
};

export function InfiniteActivityList({
	initialActivities,
	event,
	searchParams,
	sort,
	userId,
}: Props) {
	const [activities, setActivities] = useState(initialActivities);
	const [page, setPage] = useState(1); // since initial is page 0
	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);

	const observer = useRef<IntersectionObserver>(null);
	const bottomRef = useRef<HTMLDivElement>(null);

	const loadMore = useCallback(async () => {
		if (loading || !hasMore) return;

		setLoading(true);

		try {
			const res = await nativeClient.getActivities.query({
				projectId: event.id,
				page: page,
				pageSize: 5,
				sort: sort || "asc",
				...searchParams,
			});

			if (res.activities.length < 5) {
				setHasMore(false);
			}

			setActivities((prev) => [...prev, ...res.activities]);
			setPage((prev) => prev + 1);
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	}, [loading, hasMore, page, event.id, sort, searchParams]);

	useEffect(() => {
		if (observer.current) observer.current.disconnect();

		observer.current = new IntersectionObserver((entries) => {
			if (entries[0] != null && entries[0].isIntersecting) {
				loadMore();
			}
		});

		if (bottomRef.current) observer.current.observe(bottomRef.current);

		return () => observer.current?.disconnect();
	}, [loadMore]);

	const { grouped, categories } = categorizeByDate(
		activities,
		(activity) => activity.dateFrom,
	);

	const hasFilters = Object.entries(searchParams).some(([key, value]) => {
		if (key === "page" && value === 0) return false;
		if (key === "pageSize" && value === 10) return false;
		if (key === "sort" && value === "recent") return false;
		return (
			value !== undefined &&
			value !== null &&
			(Array.isArray(value) ? value.length > 0 : true)
		);
	});

	return (
		<>
			{activities.length > 0 ? (
				categories.map((category) => (
					<div key={category} className="mb-8">
						<h3 className="mb-4 text-xl font-bold">{category}</h3>
						<div className="grid gap-6 md:grid-cols-2">
							{grouped
								.get(category)!
								.map((activity, idx, arr) => {
									const isLastOdd =
										arr.length % 2 === 1 &&
										idx === arr.length - 1;
									return (
										<div
											key={activity.id}
											className={cn(
												isLastOdd
													? "md:col-span-2"
													: "",
											)}
										>
											<ActivityCard
												activity={activity}
												userId={userId}
											/>
										</div>
									);
								})}
						</div>
					</div>
				))
			) : hasFilters ? (
				<Empty />
			) : (
				<Empty
					title="Este evento ainda não possui atividades :("
					description="As atividades serão adicionadas em breve. Fique ligado!"
				/>
			)}
			<div ref={bottomRef} className="h-10" />
			{loading && (
				<div className="flex flex-row items-center justify-center gap-4 py-4 text-center">
					Carregando mais atividades...
					<LoaderCircle className="animate-spin" />
				</div>
			)}
		</>
	);
}
