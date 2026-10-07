// Components
import { Badge } from "@/components/ui/badge";

// Icons
import { Calendar, Clock, MapPin } from "lucide-react";

// Lib
import {
	getSessionsDateString,
	getSessionTimeString,
	getNextSession,
	getSessionsSorted,
	type ActivitySessionLike,
} from "@/lib/date";
import { cn } from "@/lib/utils";

interface ActivityCardTagsProps {
	activity: {
		sessions: ActivitySessionLike[];
		address?: string | null;
	};
	/** When rendered as one day of a multi-session activity, highlight that session. */
	highlightSession?: ActivitySessionLike | null;
	tagsClassName?: string;
}

export function ActivityCardTags({
	activity,
	highlightSession,
	tagsClassName,
}: ActivityCardTagsProps) {
	const sessions = getSessionsSorted(activity.sessions);
	const sessionCount = sessions.length;

	if (sessionCount === 0) return null;

	const displayDate =
		highlightSession && sessionCount > 1
			? getSessionsDateString([highlightSession])
			: getSessionsDateString(sessions);

	const displayTime =
		(highlightSession ?? sessions.length === 1)
			? getSessionTimeString((highlightSession ?? sessions[0])!)
			: (() => {
					const next = getNextSession(sessions);
					const first = next ?? sessions[0]!;
					return `${sessionCount} encontros · ${getSessionTimeString(first)}`;
				})();

	return (
		<div className="flex flex-wrap gap-2">
			<Badge
				className={cn(
					"bg-background text-foreground py-1 break-words brightness-95",
					tagsClassName,
				)}
			>
				<Calendar className="mr-2 !h-3.5 !w-3.5" />
				<span className="-mt-0.5 text-sm">{displayDate}</span>
			</Badge>
			<Badge
				className={cn(
					"bg-background text-foreground py-1 break-words brightness-95",
					tagsClassName,
				)}
			>
				<Clock className="mr-2 !h-3.5 !w-3.5" />
				<span className="-mt-0.5 text-sm">{displayTime}</span>
			</Badge>
			{/* {activity.workload ? (
				<Badge
					className={cn(
						"bg-background text-foreground py-1 break-words brightness-95",
						tagsClassName,
					)}
				>
					<BookOpen className="mr-2 !h-3.5 !w-3.5" />
					<span className="-mt-0.5 text-sm">
						{activity.workload}h
					</span>
				</Badge>
			) : null} */}
			{(highlightSession?.address ?? activity.address) ? (
				<Badge
					className={cn(
						"bg-background text-foreground py-1 break-words brightness-95",
						tagsClassName,
					)}
				>
					<MapPin className="mr-2 !h-3.5 !w-3.5" />
					<span className="-mt-0.5 text-sm">
						{highlightSession?.address ?? activity.address}
					</span>
				</Badge>
			) : null}
			{/* <Badge
				className={cn(
					"bg-background text-foreground py-1 brightness-95 break-words",
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
