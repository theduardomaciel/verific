import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

// Icons
import { Activity, BarChart3, Clock, Globe, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { GraphSelector } from "@/components/dashboard/overview/graph-selector";
import { ActivitiesList } from "@/components/dashboard/overview/activities-list";
import { MetricCard } from "@/components/dashboard/overview/metric-card";
import { serverClient } from "@/lib/trpc/server";

function DashboardSkeleton() {
	return (
		<main className="container-d py-container-v flex w-full flex-1 flex-col items-center justify-start gap-8">
			<div className="grid w-full gap-4 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-32 w-full" />
				))}
			</div>
			<div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
				<Skeleton className="h-96 w-full lg:col-span-2" />
				<Skeleton className="h-96 w-full" />
			</div>
		</main>
	);
}

async function DashboardContent() {
	const cookieStore = await cookies();
	const projectId = cookieStore.get("projectId")?.value;
	const projectUrl = cookieStore.get("projectUrl")?.value;

	if (!projectId || !projectUrl) {
		redirect("/account");
	}

	const [{ activities }, stats] = await Promise.all([
		serverClient.getActivities({
			projectId,
			sort: "asc",
			pageSize: 5,
		}),
		serverClient.getDashboardStats({ projectId }),
	]);

	return (
		<main className="container-d py-container-v flex w-full flex-1 flex-col items-center justify-start gap-8">
			<Tabs
				defaultValue="overview"
				className="flex w-full flex-1 space-y-4"
			>
				<div className="flex w-full flex-wrap items-center justify-between space-y-2">
					<h2 className="text-3xl font-bold tracking-tight">
						Dashboard
					</h2>
					<TabsList>
						<TabsTrigger value="overview">Visão Geral</TabsTrigger>
						<TabsTrigger value="analytics" disabled>
							Relatórios
						</TabsTrigger>
						<TabsTrigger value="reports" disabled>
							Logs
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="overview" className="space-y-4">
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
							value={`~${stats.meanWorkloadPerParticipant.toFixed(0)}h`}
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

					{/* TODO: Não escala pra 100% do espaço disponível */}
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
						<Card className="flex flex-col gap-8 overflow-hidden lg:col-span-2">
							<CardHeader className="flex flex-row items-center justify-between">
								<CardTitle>Participantes</CardTitle>
								<div className="hidden items-center space-x-2 md:flex">
									{/* <CalendarDateRangePicker className="pointer-events-none opacity-50" />
									<Button disabled>Gerar relatório</Button> */}
									<Button disabled asChild>
										<Link href={`/${projectUrl}`}>
											<Globe className="mr-2" size={24} />
											Acessar página do evento
										</Link>
									</Button>
								</div>
							</CardHeader>
							<CardContent className="relative flex flex-1">
								<GraphSelector
									graphData={stats.graphData}
									coursesData={stats.coursesData}
								/>
							</CardContent>
						</Card>
						<ActivitiesList
							activities={activities}
							className="h-fit overflow-y-scroll lg:max-h-[75vh]"
						/>
					</div>
				</TabsContent>
			</Tabs>
		</main>
	);
}

export default function Overview() {
	return (
		<Suspense fallback={<DashboardSkeleton />}>
			<DashboardContent />
		</Suspense>
	);
}
