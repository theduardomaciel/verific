import { cn } from "@/lib/utils";

// Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleActivityCard } from "@/components/dashboard/activity-card";
import { getActivities } from "@/lib/data";

export async function ActivitiesList({ className }: { className?: string }) {
	const activities = await getActivities({});
	console.log(activities);

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
						name={activity.name}
						speaker={activity.speaker}
						category={activity.category as "lecture"}
						dateFrom={activity.dateFrom}
					/>
				))}
			</CardContent>
		</Card>
	);
}
