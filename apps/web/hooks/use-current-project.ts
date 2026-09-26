"use client";

import { trpc } from "@/lib/trpc/react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import type { RouterOutput } from "@verific/api";

interface CurrentProjectQuery {
	data: RouterOutput["getProject"] | undefined;
	isPending: boolean;
	isError: boolean;
}

export function useCurrentProject(): CurrentProjectQuery {
	const { projectId } = useDashboard();

	const query = trpc.getProject.useQuery({ id: projectId });

	return {
		data: query.data,
		isPending: query.isPending,
		isError: query.isError,
	};
}
