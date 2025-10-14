import { Calendar, Clock, Timer } from "lucide-react";

// Components
import { Badge } from "@/components/ui/badge";

// Data
import { formatFriendlyDate, isLive, isStartingSoon } from "@/lib/data";

interface Props {
	dateFrom: Date;
	dateFormat?: "short" | "long";
	speaker?: { name: string; imageUrl: string | null } | null;
}

export function ActivityStatus({ dateFrom, dateFormat, speaker }: Props) {
	return isLive(dateFrom) ? (
		<Badge className="gap-2" variant="destructive">
			<div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white">
				<div className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-white" />
			</div>
			AGORA
		</Badge>
	) : isStartingSoon(dateFrom) ? (
		<Badge variant="secondary">
			<Timer className="h-4 w-4" />
			EM INSTANTES
		</Badge>
	) : (
		<div className="text-foreground flex items-center justify-center gap-2">
			{speaker ? (
				<Calendar className="mt-[1.2px] h-4 w-4" />
			) : (
				<Clock className="mt-[1.2px] h-3 w-3" />
			)}
			<p className="text-sm leading-0 overflow-ellipsis">
				{formatFriendlyDate(dateFrom, !!speaker, dateFormat === "long")}
			</p>
		</div>
	);
}
