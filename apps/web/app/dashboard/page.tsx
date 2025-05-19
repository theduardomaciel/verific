import { Activity, BarChart3, Clock, Users } from "lucide-react";

// Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { CalendarDateRangePicker } from "@/components/dashboard/overview/calendar-date-range-picker";
import { ParticipantsGraph } from "@/components/dashboard/overview/participants-graph";
import { ActivitiesList } from "@/components/dashboard/overview/activities-list";
import { MetricCard } from "@/components/dashboard/overview/metric-card";

export default function Overview() {
	return (
		<main className="container-p py-container flex w-full flex-1 flex-col items-center justify-start gap-8">
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
							value="+1,239"
							change="+15% desde a última hora"
							icon={
								<Users className="text-muted-foreground h-4 w-4" />
							}
						/>
						<MetricCard
							title="Horas por participante"
							value="~8h"
							change="~45% do total possível"
							icon={
								<Clock className="text-muted-foreground h-4 w-4" />
							}
						/>
						<MetricCard
							title="Participantes ativos"
							value="512"
							change="41% no último dia"
							icon={
								<Activity className="text-muted-foreground h-4 w-4" />
							}
						/>
						<MetricCard
							title="Taxa de ocupação"
							value="64%"
							change="+21% do último dia"
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
									<CalendarDateRangePicker />
									<Button>Gerar relatório</Button>
								</div>
							</CardHeader>
							<CardContent className="flex flex-1">
								<ParticipantsGraph />
							</CardContent>
						</Card>
						<ActivitiesList className="h-fit overflow-y-scroll lg:max-h-[75vh]" />
					</div>
				</TabsContent>
			</Tabs>
		</main>
	);
}
