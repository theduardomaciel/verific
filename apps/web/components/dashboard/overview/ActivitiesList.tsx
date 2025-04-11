import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityCard } from "@/components/dashboard/overview/ActivityCard";
import { cn } from "@/lib/utils";

export function ActivitiesList({ className }: { className?: string }) {
	return (
		<Card className={cn("h-auto", className)}>
			<CardHeader>
				<CardTitle className="text-base font-medium">
					Próximas atividades
				</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-4">
				<ActivityCard
					number={1}
					title="Atividade 1"
					presenter="Carlos Magno Pereira"
					type="PALESTRA"
					status="AGORA"
				/>
				<ActivityCard
					number={2}
					title="Atividade 2"
					presenter="Ângela Batista Santos"
					type="RODA DE CONVERSA"
					status="EM INSTANTES"
				/>
				<ActivityCard
					number={3}
					title="Atividade 3"
					presenter="José Ribeiro Correia"
					type="WORKSHOP"
					status="HOJE"
					time="Hoje, às 17h"
				/>
				<ActivityCard
					number={4}
					title="Atividade 4"
					presenter="Fernando Machado"
					type="MINICURSO"
					status="HOJE"
					time="Hoje, às 18h"
				/>
			</CardContent>
		</Card>
	);
}
