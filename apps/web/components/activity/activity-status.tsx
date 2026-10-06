import { Calendar, Timer } from "lucide-react";

// Components
import { Badge } from "@/components/ui/badge";

// Data
import {
	formatFriendlyDate,
	FriendlyDateOptions,
	getLiveSession,
	getNextSession,
	type ActivitySessionLike,
} from "@/lib/date";

import { cn } from "@/lib/utils";

interface Props {
	className?: string;
	sessions: ActivitySessionLike[];
	dateFormat: FriendlyDateOptions;
}

export function ActivityStatus({ className, sessions, dateFormat }: Props) {
	const live = getLiveSession(sessions);
	const next = live ? null : getNextSession(sessions);

	if (live) {
		return (
			<Badge className="gap-2" variant="destructive">
				<div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white">
					<div className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-white" />
				</div>
				AGORA
			</Badge>
		);
	}

	if (next) {
		const startsIn = new Date(next.startsAt).getTime() - Date.now();
		if (startsIn <= 15 * 60 * 1000) {
			return (
				<Badge variant="secondary">
					<Timer className="h-4 w-4" />
					EM INSTANTES
				</Badge>
			);
		}
		return (
			<div
				className={cn(
					"text-foreground flex items-center justify-center gap-2",
					className,
				)}
			>
				<Calendar className="mt-[1.2px] h-4 w-4" />
				<p className="text-sm leading-0 overflow-ellipsis">
					{formatFriendlyDate(new Date(next.startsAt), dateFormat)}
				</p>
			</div>
		);
	}

	// No upcoming sessions: show the last session date
	const last = sessions[sessions.length - 1];
	if (!last) return null;

	return (
		<div
			className={cn(
				"text-foreground flex items-center justify-center gap-2",
				className,
			)}
		>
			<Calendar className="mt-[1.2px] h-4 w-4" />
			<p className="text-sm leading-0 overflow-ellipsis">
				{formatFriendlyDate(new Date(last.startsAt), dateFormat)}
			</p>
		</div>
	);
}
