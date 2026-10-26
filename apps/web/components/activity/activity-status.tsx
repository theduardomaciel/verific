import { Calendar, Timer } from "lucide-react";

// Components
import { Badge } from "@/components/ui/badge";

import { useNow } from "@/hooks/use-now";
// Data
import {
	formatFriendlyDate,
	getLiveSession,
	getNextSession,
	type ActivitySessionLike,
	type FriendlyDateOptions,
} from "@/lib/date";
import { cn } from "@/lib/utils";

interface Props {
	className?: string;
	sessions: ActivitySessionLike[];
	dateFormat: FriendlyDateOptions;
}

export function ActivityStatus({ className, sessions, dateFormat }: Props) {
	// Sem hora no servidor: mostra só a data da primeira sessão
	const now = useNow();
	const live = now ? getLiveSession(sessions, now) : null;
	const next = now ? (live ? null : getNextSession(sessions, now)) : null;
	const format = { ...dateFormat, now };

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
		const startsIn = new Date(next.startsAt).getTime() - now!.getTime();
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
					{formatFriendlyDate(new Date(next.startsAt), format)}
				</p>
			</div>
		);
	}

	// No upcoming sessions: show the last session date
	const last = now ? sessions[sessions.length - 1] : sessions[0];
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
				{formatFriendlyDate(new Date(last.startsAt), format)}
			</p>
		</div>
	);
}
