import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Icons
import { Activity, BarChart3, Clock, Globe, Users } from "lucide-react";

// Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { ParticipantsGraph } from "@/components/dashboard/overview/participants-graph";
import { ActivitiesList } from "@/components/dashboard/overview/activities-list";
import { MetricCard } from "@/components/dashboard/overview/metric-card";

// API
import { serverClient } from "@/lib/trpc/server";

export default async function Overview() {
	const cookieStore = await cookies();
	const projectId = cookieStore.get("projectId")!.value;
	const projectUrl = cookieStore.get("projectUrl")!.value;

	const { activities } = await serverClient.getActivities({
		projectId,
	});

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
							value="+?"
							change="+?% desde a última hora"
							icon={
								<Users className="text-muted-foreground h-4 w-4" />
							}
						/>
						<MetricCard
							title="Horas por participante"
							value="~?h"
							change="~?% do total possível"
							icon={
								<Clock className="text-muted-foreground h-4 w-4" />
							}
						/>
						<MetricCard
							title="Participantes ativos"
							value="?"
							change="?% no último dia"
							icon={
								<Activity className="text-muted-foreground h-4 w-4" />
							}
						/>
						<MetricCard
							title="Taxa de ocupação"
							value="?%"
							change="+?% do último dia"
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
								<ParticipantsGraph className="pointer-events-none opacity-25 select-none" />
								<div className="absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 animate-pulse flex-row items-center justify-center gap-4">
									<BarChart3 size={24} />
									<p className="text-muted-foreground transform text-center text-lg select-none">
										Dados insuficientes para gerar o gráfico
									</p>
								</div>
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
