import { cn } from "@/lib/utils";

// Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityCard } from "@/components/dashboard/overview/activity-card";

export function ActivitiesList({ className }: { className?: string }) {
	return (
		<Card className={cn("h-auto gap-2", className)}>
			<CardHeader>
				<CardTitle className="text-base font-medium">
					Próximas atividades
				</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-4">
				<ActivityCard
					title="Atividade 1"
					speaker="Carlos Magno Pereira"
					type="PALESTRA"
					time="AGORA"
				/>
				<ActivityCard
					title="Atividade 2"
					speaker="Ângela Batista Santos"
					type="RODA DE CONVERSA"
					time="EM BREVE"
				/>
				<ActivityCard
					title="Atividade 3"
					speaker="José Ribeiro Correia"
					type="WORKSHOP"
					time="Hoje, às 17h"
				/>
				<ActivityCard
					title="Atividade 4"
					speaker="Fernando Machado"
					type="MINICURSO"
					time="Hoje, às 18h"
				/>
				<ActivityCard
					title="Atividade 4"
					speaker="Fernando Machado"
					type="MINICURSO"
					time="Hoje, às 18h"
				/>
				<ActivityCard
					title="Atividade 4"
					speaker="Fernando Machado"
					type="MINICURSO"
					time="Hoje, às 18h"
				/>
			</CardContent>
		</Card>
	);
}
