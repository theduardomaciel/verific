import Link from "next/link";

import { cn } from "@/lib/utils";

// Icons
import { Calendar, Clock, Timer, User, Users } from "lucide-react";

// Components
import { Badge } from "@/components/ui/badge";

// Data
import {
	formatFriendlyDate,
	isLive,
	isStartingSoon,
	type Activity,
} from "@/lib/data";

const EVENT_TYPE_LABELS: Record<string, string> = {
	lecture: "Palestra",
	workshop: "Worskhop",
	"round-table": "Mesa Redonda",
	"mini-course": "Minicurso",
};

interface SimpleActivityCardProps
	extends Pick<Activity, "speaker" | "category" | "date" | "title" | "id"> {
	className?: string;
}
interface ActivityCardProps extends Activity {
	className?: string;
}

export function SimpleActivityCard({
	id,
	title,
	speaker,
	category,
	date,
	className,
}: SimpleActivityCardProps) {
	return (
		<Link
			href={`/dashboard/activities/${id}`}
			className={cn(
				"flex hover:bg-foreground/5 flex-col md:flex-row items-start justify-start md:justify-between rounded-md border p-4 gap-2",
				className,
			)}
		>
			<div className="flex flex-col items-start justify-center text-foreground h-full">
				<h3 className="font-semibold font-dashboard">{title}</h3>
				<p className="text-sm text-muted-foreground/80">
					{speaker && <span>{speaker}</span>}
				</p>
			</div>
			<ActivityInfo category={category} date={date} />
		</Link>
	);
}

export function ActivityCard({
	id,
	title,
	speaker,
	category,
	date,
	description,
	monitors,
	participants,
	className,
}: ActivityCardProps) {
	return (
		<Link href={`/dashboard/activities/${id}`} className="flex w-full">
			<div
				className={cn(
					"rounded-md border bg-card w-full hover:bg-card-foreground/10 transition-colors",
					className,
				)}
			>
				<div className="p-6 space-y-4">
					<div className="flex justify-between items-start">
						<h3 className="text-xl font-semibold font-dashboard text-foreground">
							{title}
						</h3>
						{id && <span className="text-sm text-muted-foreground">#{id}</span>}
					</div>

					{description && (
						<p className="text-foreground text-sm line-clamp-3">
							{description}
						</p>
					)}

					<ActivityInfo speaker={speaker} category={category} date={date} />

					{(monitors || participants) && (
						<div className="flex flex-wrap gap-4 justify-between items-center pt-2 border-t">
							{monitors && monitors.length > 0 && (
								<div className="flex items-center gap-2">
									<div className="flex -space-x-2">
										{monitors.map((monitor, _) => (
											<div
												key={monitor}
												className="h-6 w-6 rounded-full bg-accent border-2 border-card flex items-center justify-center overflow-hidden"
											>
												<User className="h-3 w-3 text-foreground" />
											</div>
										))}
									</div>
									<span className="text-xs text-foreground">
										Monitorado por {monitors.join(", ")}
									</span>
								</div>
							)}

							{participants && (
								<div className="flex items-center gap-1 text-xs text-foreground">
									<Users className="h-4 w-4" />
									<span>+ de {participants} participantes inscritos</span>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</Link>
	);
}

interface InfoProps extends Pick<Activity, "category" | "date"> {
	speaker?: Activity["speaker"];
}

function ActivityInfo({ speaker, category, date }: InfoProps) {
	const eventTypeLabel = EVENT_TYPE_LABELS[category] || category;

	return (
		<div
			className={cn("flex flex-wrap justify-between items-center gap-2", {
				"md:flex-col md:items-end max-md:w-full": !speaker,
			})}
		>
			<div className="flex items-center gap-2">
				<span className="text-muted-foreground/80 uppercase text-sm font-bold">
					{eventTypeLabel}
				</span>
				{speaker && (
					<span className="text-foreground font-medium">{speaker}</span>
				)}
			</div>

			{isLive(date) ? (
				<Badge className="gap-2" variant="destructive">
					<div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse">
						<div className="w-1.5 h-1.5 rounded-full bg-white animate-ping absolute" />
					</div>
					AGORA
				</Badge>
			) : isStartingSoon(date) ? (
				<Badge variant="secondary">
					<Timer className="h-4 w-4" />
					EM INSTANTES
				</Badge>
			) : (
				<div className="flex items-center justify-center gap-2 text-foreground">
					{speaker ? (
						<Calendar className="h-4 w-4 mt-[1.2px]" />
					) : (
						<Clock className="h-3 w-3 mt-[1.2px]" />
					)}
					<p className="text-sm leading-0">
						{formatFriendlyDate(date, !!speaker)}
					</p>
				</div>
			)}
		</div>
	);
}
