import { ActivityCard } from "@/components/dashboard/activity-card";
import { Activity } from "@/lib/types/activity";

interface ActivityListProps {
	activities: Activity[];
}

export function ActivityList({ activities }: ActivityListProps) {
	if (activities.length === 0) {
		return (
			<div className="rounded-md border p-8 text-center">
				<h3 className="text-lg font-medium">
					Nenhuma atividade encontrada
				</h3>
				<p className="mt-2 text-sm text-gray-500">
					Tente ajustar seus filtros ou criar uma nova atividade.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-start justify-start gap-4">
			{activities.map((activity) => (
				<ActivityCard {...activity} key={activity.id} />
			))}
		</div>
	);
}
