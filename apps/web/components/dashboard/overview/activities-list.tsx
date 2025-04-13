import { cn } from "@/lib/utils";

import { activities } from "@/lib/data";

// Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleActivityCard } from "@/components/dashboard/activity-card";

export function ActivitiesList({ className }: { className?: string }) {
	return (
		<Card className={cn("h-auto gap-2", className)}>
			<CardHeader>
				<CardTitle className="text-base font-medium">
					Próximas atividades
				</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-4">
				{activities.map((activity, _) => (
					<SimpleActivityCard
						key={activity.id}
						id={activity.id}
						title={activity.title}
						speaker={activity.speaker}
						category={activity.category as "lecture"}
						date={activity.date}
					/>
				))}
			</CardContent>
		</Card>
	);
}
