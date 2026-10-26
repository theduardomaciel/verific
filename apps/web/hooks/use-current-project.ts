"use client";

import type { RouterOutput } from "@verific/api";

import { useDashboard } from "@/components/dashboard/dashboard-context";

import { trpc } from "@/lib/trpc/react";

interface CurrentProjectQuery {
	data: RouterOutput["getProject"] | undefined;
	isPending: boolean;
	isError: boolean;
}

export function useCurrentProject(): CurrentProjectQuery {
	const { projectId } = useDashboard();

	const query = trpc.getProject.useQuery(
		{ id: projectId },
		{
			staleTime: 60 * 1000,
			gcTime: 10 * 60 * 1000,
			refetchOnWindowFocus: false,
			// Depois de salvar, a leitura não pode vir do cache de borda
			trpc: { context: { fresh: true } },
		},
	);

	return {
		data: query.data,
		isPending: query.isPending,
		isError: query.isError,
	};
}
