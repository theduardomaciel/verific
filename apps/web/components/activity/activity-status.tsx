import { Calendar, Timer } from "lucide-react";

// Components
import { Badge } from "@/components/ui/badge";

// Data
import {
	formatFriendlyDate,
	FriendlyDateOptions,
	isLive,
	isStartingSoon,
} from "@/lib/date";

import { cn } from "@/lib/utils";

interface Props {
	className?: string;
	date: Date;
	dateFormat: FriendlyDateOptions;
}

export function ActivityStatus({ className, date, dateFormat }: Props) {
	return isLive(date) ? (
		<Badge className="gap-2" variant="destructive">
			<div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white">
				<div className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-white" />
			</div>
			AGORA
		</Badge>
	) : isStartingSoon(date) ? (
		<Badge variant="secondary">
			<Timer className="h-4 w-4" />
			EM INSTANTES
		</Badge>
	) : (
		<div
			className={cn(
				"text-foreground flex items-center justify-center gap-2",
				className,
			)}
		>
			<Calendar className="mt-[1.2px] h-4 w-4" />
			<p className="text-sm leading-0 overflow-ellipsis">
				{formatFriendlyDate(date, dateFormat)}
			</p>
		</div>
	);
}
