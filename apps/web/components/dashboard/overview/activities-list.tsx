import type { RouterOutput } from "@verific/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { SimpleActivityCard } from "@/components/activity/activity-card/dashboard";

import { cn } from "@/lib/utils";

interface Props {
	className?: string;
	activities: RouterOutput["getActivities"]["activities"];
}

export function ActivitiesList({ activities, className }: Props) {
	return (
		<Card
			className={cn(
				"h-auto min-h-0 flex flex-col gap-2 overflow-hidden pb-0",
				className,
			)}
		>
			<CardHeader className="shrink-0">
				<CardTitle className="text-base font-medium">
					Próximas atividades
				</CardTitle>
			</CardHeader>
			<CardContent className="grid min-h-0 flex-1 content-start items-start gap-4 overflow-y-auto">
				{activities.length > 0 ? (
					activities.map((activity) => (
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
