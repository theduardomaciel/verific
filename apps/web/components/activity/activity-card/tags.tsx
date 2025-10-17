// Components
import { Badge } from "@/components/ui/badge";

// Icons
import { Calendar, Clock, BookOpen, MapPin } from "lucide-react";

// Lib
import { getDateString, getTimeString } from "@/lib/date";
import { cn } from "@/lib/utils";

interface ActivityCardTagsProps {
	activity: {
		dateFrom: Date;
		dateTo: Date;
		workload?: number | null;
		address?: string | null;
	};
	tagsClassName?: string;
}

export function ActivityCardTags({
	activity,
	tagsClassName,
}: ActivityCardTagsProps) {
	const displayDate = getDateString(activity.dateFrom, activity.dateTo);
	const displayTime = getTimeString(activity.dateFrom);

	return (
		<div className="flex flex-wrap gap-2">
			<Badge
				className={cn(
					"bg-background text-foreground py-1 brightness-95",
					tagsClassName,
				)}
			>
				<Calendar className="mr-2 !h-3.5 !w-3.5" />
				<span className="-mt-0.5 text-sm">{displayDate}</span>
			</Badge>
			<Badge
				className={cn(
					"bg-background text-foreground py-1 brightness-95",
					tagsClassName,
				)}
			>
				<Clock className="mr-2 !h-3.5 !w-3.5" />
				<span className="-mt-0.5 text-sm">{displayTime}</span>
			</Badge>
			{activity.workload ? (
				<Badge
					className={cn(
						"bg-background text-foreground py-1 brightness-95",
						tagsClassName,
					)}
				>
					<BookOpen className="mr-2 !h-3.5 !w-3.5" />
					<span className="-mt-0.5 text-sm">
						{activity.workload}h
					</span>
				</Badge>
			) : null}
			{activity.address ? (
				<Badge
					className={cn(
						"bg-background text-foreground py-1 brightness-95",
						tagsClassName,
					)}
				>
					<MapPin className="mr-2 !h-3.5 !w-3.5" />
					<span className="-mt-0.5 text-sm">{activity.address}</span>
				</Badge>
			) : null}
			{/* <Badge
				className={cn(
					"bg-background text-foreground py-1 brightness-95",
					tagsClassName,
				)}
			>
				<Users className="mr-2 !h-3.5 !w-3.5" />
				<span className="-mt-0.5 text-sm capitalize">
					{activity.audience === "internal" ? "Interno" : "Externo"}
				</span>
			</Badge> */}
		</div>
	);
}
