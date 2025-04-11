import { Activity, BarChart3, Clock, Users } from "lucide-react";

// Components
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { CalendarDateRangePicker } from "@/components/dashboard/overview/CalendarDateRangePicker";
import { ParticipantsGraph } from "@/components/dashboard/overview/ParticipantsGraph";
import { ActivitiesList } from "@/components/dashboard/overview/ActivitiesList";
import { MetricCard } from "@/components/dashboard/overview/MetricCard";

export default function Overview() {
	return (
		<main className="flex flex-1 w-full flex-col items-center justify-start px-dashboard py-8 gap-8">
			<Tabs defaultValue="overview" className="flex flex-1 space-y-4 w-full">
				<div className="flex items-center flex-wrap justify-between space-y-2 w-full">
					<h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
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
							icon={<Users className="h-4 w-4 text-muted-foreground" />}
						/>
						<MetricCard
							title="Horas por participante"
							value="~8h"
							change="~45% do total possível"
							icon={<Clock className="h-4 w-4 text-muted-foreground" />}
						/>
						<MetricCard
							title="Participantes ativos"
							value="512"
							change="41% no último dia"
							icon={<Activity className="h-4 w-4 text-muted-foreground" />}
						/>
						<MetricCard
							title="Taxa de ocupação"
							value="64%"
							change="+21% do último dia"
							icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
						/>
					</div>

					{/* TODO: Não escala pra 100% do espaço disponível */}
					<div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
						<Card className="lg:col-span-2 flex flex-col overflow-hidden gap-8">
							<CardHeader className="flex flex-row items-center justify-between">
								<CardTitle>Participantes</CardTitle>
								<div className="hidden md:flex items-center space-x-2">
									<CalendarDateRangePicker />
									<Button>Gerar relatório</Button>
								</div>
							</CardHeader>
							<CardContent className="flex flex-1">
								<ParticipantsGraph />
							</CardContent>
						</Card>
						<ActivitiesList className="h-fit lg:max-h-[75vh] overflow-y-scroll" />
					</div>
				</TabsContent>
			</Tabs>
		</main>
	);
}
