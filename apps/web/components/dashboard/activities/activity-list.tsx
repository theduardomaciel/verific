import { ActivityCard } from "@/components/dashboard/activity-card";
import type { Activity } from "@/lib/data";

interface ActivityListProps {
	activities: Activity[];
}

export function ActivityList({ activities }: ActivityListProps) {
	if (activities.length === 0) {
		return (
			<div className="p-8 text-center border rounded-md">
				<h3 className="text-lg font-medium">Nenhuma atividade encontrada</h3>
				<p className="text-sm text-gray-500 mt-2">
					Tente ajustar seus filtros ou criar uma nova atividade.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-start justify-start gap-4">
			{activities.map((activity) => (
				<ActivityCard
					key={activity.id}
					title={activity.title}
					description={activity.description}
					speaker={activity.speaker}
					category={activity.category}
					date={activity.date}
					id={activity.id}
					monitors={activity.monitors}
					participants={activity.participants}
				/>
			))}
		</div>
	);
}
