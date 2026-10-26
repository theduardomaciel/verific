"use client";

import Link from "next/link";

import { Activity, BarChart3, Clock, Globe, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useDashboard } from "@/components/dashboard/dashboard-context";
import { ActivitiesList } from "@/components/dashboard/overview/activities-list";
import { GraphSelector } from "@/components/dashboard/overview/graph-selector";
import { MetricCard } from "@/components/dashboard/overview/metric-card";

import { formatWorkload } from "@/lib/date";
import { trpc } from "@/lib/trpc/react";

export function DashboardSkeleton() {
	return (
		<main className="container-d py-container-v flex min-h-[calc(100dvh-var(--dashboard-header-height))] w-full flex-1 flex-col items-center justify-start gap-4">
			<Skeleton className="mb-2 h-11 w-full" />
			<div className="grid w-full gap-4 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-35.5 w-full" />
				))}
			</div>
			<div className="grid w-full grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-3">
				<Skeleton className="h-96 w-full lg:col-span-2 lg:h-full lg:min-h-0" />
				<Skeleton className="h-96 w-full lg:h-full lg:min-h-0" />
			</div>
		</main>
	);
}

export function Overview() {
	const { projectId, projectUrl } = useDashboard();

	const activitiesQuery = trpc.getActivities.useQuery(
		{ projectId, sort: "asc", pageSize: 5 },
		{ staleTime: 2 * 60 * 1000, refetchOnWindowFocus: false },
	);
	const statsQuery = trpc.getDashboardStats.useQuery(
		{ projectId },
		{ staleTime: 2 * 60 * 1000, refetchOnWindowFocus: false },
	);

	if (activitiesQuery.isPending || statsQuery.isPending) {
		return <DashboardSkeleton />;
	}

	if (activitiesQuery.isError || statsQuery.isError) {
		return (
			<main className="container-d py-container-v flex min-h-[calc(100dvh-var(--dashboard-header-height))] w-full flex-1 flex-col items-center justify-start">
				<p className="text-muted-foreground text-sm">
					Não foi possível carregar o dashboard. Tente recarregar a
					página.
				</p>
			</main>
		);
	}

	const { activities } = activitiesQuery.data;
	const stats = statsQuery.data;

	return (
		<main className="container-d py-container-v flex min-h-[calc(100dvh-var(--dashboard-header-height))] w-full flex-1 flex-col items-center justify-start gap-8 md:max-h-[calc(100dvh-var(--dashboard-header-height))]">
			<Tabs
				defaultValue="overview"
				className="flex w-full flex-1 flex-col lg:min-h-0"
			>
				<div className="mb-4 flex w-full flex-wrap items-center justify-between space-y-2">
					<h2 className="text-3xl font-bold tracking-tight">
						Dashboard
					</h2>
					{/* TODO: Não podemos adicionar w-full pois o flex-wrap quebra.
						Bom o suficiente por enquanto, mas o botão não ocupa 100% da largura em todos os casos */}
					<div className="flex flex-wrap items-center gap-4">
						<TabsList>
							<TabsTrigger value="overview">
								Visão Geral
							</TabsTrigger>
							<TabsTrigger value="analytics" disabled>
								Relatórios
							</TabsTrigger>
							<TabsTrigger value="reports" disabled>
								Logs
							</TabsTrigger>
						</TabsList>
						<Button className="max-sm:w-full" disabled asChild>
							<Link target="_blank" href={`/${projectUrl}`}>
								<Globe className="mr-2" size={24} />
								Acessar página do evento
							</Link>
						</Button>
					</div>
				</div>

				<TabsContent
					value="overview"
					className="flex min-h-0 flex-col space-y-4"
				>
					{/* Statistics */}
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<MetricCard
							title="Participantes inscritos"
							value={`+${stats.totalParticipants}`}
							change={`+${stats.participantsInLastHourPercentage.toFixed(
								1,
							)}% desde a última hora`}
							icon={
								<Users className="text-muted-foreground h-4 w-4" />
							}
						/>
						<MetricCard
							title="Horas por participante"
							value={`~${formatWorkload(stats.meanWorkloadPerParticipant)}`}
							change={`~${stats.meanPercentageFromTotalWorkload.toFixed(
								1,
							)}% do total possível`}
							icon={
								<Clock className="text-muted-foreground h-4 w-4" />
							}
						/>
						<MetricCard
							title="Participantes ativos"
							value={`${stats.activeParticipants}`}
							change={`${stats.activeParticipantsInLastDay.toFixed(
								1,
							)}% no último dia`}
							icon={
								<Activity className="text-muted-foreground h-4 w-4" />
							}
						/>
						<MetricCard
							title="Taxa de ocupação"
							value={`${stats.occupancyRate.toFixed(1)}%`}
							change={`+${stats.occupancyRate.toFixed(1)}% do último dia`}
							icon={
								<BarChart3 className="text-muted-foreground h-4 w-4" />
							}
						/>
					</div>

					{/* Fills the remaining height on desktop */}
					<div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-3">
						<Card className="flex min-h-0 flex-col gap-8 overflow-hidden lg:col-span-2">
							<CardContent className="relative flex min-h-0 flex-1">
								<GraphSelector />
							</CardContent>
						</Card>
						<ActivitiesList
							activities={activities}
							className="min-h-0 overflow-hidden lg:h-full lg:min-h-0"
						/>
					</div>
				</TabsContent>
			</Tabs>
		</main>
	);
}
