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

export default function Overview() {
	return (
		<main className="flex flex-1 w-full flex-col items-center justify-start px-dashboard py-8 gap-8">
			<Tabs defaultValue="overview" className="space-y-4 w-full">
				<div className="flex items-center justify-between space-y-2 w-full">
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
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Participantes inscritos
								</CardTitle>
								<Users className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">+1,239</div>
								<p className="text-xs text-muted-foreground">
									+15% desde a última hora
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Horas por participante
								</CardTitle>
								<Clock className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">~8h</div>
								<p className="text-xs text-muted-foreground">
									~45% do total possível
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Participantes ativos
								</CardTitle>
								<Activity className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">512</div>
								<p className="text-xs text-muted-foreground">
									41% no último dia
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Taxa de ocupação
								</CardTitle>
								<BarChart3 className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">64%</div>
								<p className="text-xs text-muted-foreground">
									+21% do último dia
								</p>
							</CardContent>
						</Card>
					</div>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
						<Card className="col-span-4 gap-6">
							<CardHeader className="flex flex-row items-center justify-between">
								<CardTitle>Participantes</CardTitle>
								<div className="hidden md:flex items-center space-x-2">
									<CalendarDateRangePicker />
									<Button>Gerar relatório</Button>
								</div>
							</CardHeader>
							<CardContent className="pl-2">
								<ParticipantsGraph />
							</CardContent>
						</Card>
						<ActivitiesList className="col-span-3" />
					</div>
				</TabsContent>
			</Tabs>
		</main>
	);
}
