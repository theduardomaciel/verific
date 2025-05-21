import { cn } from "@/lib/utils";

// Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleActivityCard } from "@/components/dashboard/activity-card";

// Types
import { RouterOutput } from "@verific/api";

interface Props {
	className?: string;
	activities: RouterOutput["getActivities"]["activities"];
}

export async function ActivitiesList({ activities, className }: Props) {
	return (
		<Card className={cn("h-auto gap-2", className)}>
			<CardHeader>
				<CardTitle className="text-base font-medium">
					Próximas atividades
				</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-4">
				{activities.length > 0 ? (
					activities.map((activity, _) => (
						<SimpleActivityCard
							key={activity.id}
							activity={activity}
						/>
					))
				) : (
					<p className="text-muted-foreground flex flex-1">
						Nenhuma atividade encontrada.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
