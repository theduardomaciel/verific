import Link from "next/link";

import { cn } from "@/lib/utils";

// Icons
import { Calendar, Clock, Timer, User, Users } from "lucide-react";

// Components
import { Badge } from "@/components/ui/badge";

// Data
import { formatFriendlyDate, isLive, isStartingSoon } from "@/lib/data";
import { Activity } from "@/lib/types/activity";

const EVENT_TYPE_LABELS: Record<string, string> = {
	lecture: "Palestra",
	workshop: "Worskhop",
	"round-table": "Mesa Redonda",
	course: "Minicurso",
};

interface SimpleActivityCardProps
	extends Pick<
		Activity,
		"speaker" | "category" | "dateFrom" | "name" | "id"
	> {
	className?: string;
}
interface ActivityCardProps extends Activity {
	className?: string;
}

export function SimpleActivityCard({
	id,
	name,
	speaker,
	category,
	dateFrom,
	className,
}: SimpleActivityCardProps) {
	return (
		<Link
			href={`/dashboard/activities/${id}`}
			className={cn(
				"hover:bg-foreground/5 flex flex-col items-start justify-start gap-2 rounded-md border p-4 md:flex-row md:justify-between",
				className,
			)}
		>
			<div className="text-foreground flex h-full flex-col items-start justify-center">
				<h3 className="font-dashboard font-semibold">{name}</h3>
				<p className="text-muted-foreground/80 text-sm">
					{speaker && <span>{speaker.name}</span>}
				</p>
			</div>
			<ActivityInfo category={category} dateFrom={dateFrom} />
		</Link>
	);
}

export function ActivityCard({
	id,
	name,
	speaker,
	category,
	dateFrom,
	description,
	participantsOnActivity,
	className,
}: ActivityCardProps) {
	const monitors =
		participantsOnActivity
			?.filter((participant) => participant.role === "moderator")
			.map((participant) => participant.participant.user.name) || [];
	const participantsAmount =
		participantsOnActivity?.filter(
			(participant) => participant.role === "participant",
		).length || 0;

	return (
		<Link href={`/dashboard/activities/${id}`} className="flex w-full">
			<div
				className={cn(
					"bg-card hover:bg-secondary group w-full rounded-md border transition-colors",
					className,
				)}
			>
				<div className="space-y-4 p-6">
					<div className="flex items-start justify-between">
						<h3 className="font-dashboard text-foreground text-xl font-semibold">
							{name}
						</h3>
						{id && (
							<span className="text-muted-foreground text-sm">
								#{id}
							</span>
						)}
					</div>

					{description && (
						<p className="text-foreground line-clamp-3 text-sm">
							{description}
						</p>
					)}

					<ActivityInfo
						speaker={speaker}
						category={category}
						dateFrom={dateFrom}
					/>

					{(monitors || participantsAmount) && (
						<div className="flex flex-wrap items-center justify-between gap-4 border-t pt-2">
							{monitors && monitors.length > 0 && (
								<div className="flex items-center gap-2">
									<div className="flex -space-x-2">
										{monitors.map((monitor) => (
											<div
												key={monitor}
												className="bg-accent border-card group-hover:border-secondary flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 transition-colors"
											>
												<User className="text-foreground h-3 w-3" />
											</div>
										))}
									</div>
									<span className="text-foreground text-xs">
										Monitorado por {monitors.join(", ")}
									</span>
								</div>
							)}

							{participantsAmount ? (
								<div className="text-foreground flex items-center gap-1 text-xs">
									<Users className="h-4 w-4" />
									<span>
										{participantsAmount === 1
											? "1 participante inscrito"
											: `+ de ${participantsAmount} participantes inscritos`}
									</span>
								</div>
							) : (
								<div className="text-foreground flex items-center gap-1 text-xs">
									<span>Sem participantes inscritos</span>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</Link>
	);
}

interface InfoProps extends Pick<Activity, "category" | "dateFrom"> {
	speaker?: Activity["speaker"];
}

function ActivityInfo({ speaker, category, dateFrom }: InfoProps) {
	const eventTypeLabel = EVENT_TYPE_LABELS[category] || category;

	return (
		<div
			className={cn("flex flex-wrap items-center justify-between gap-2", {
				"w-full md:flex-col md:items-end": !speaker,
			})}
		>
			<div className="flex items-center gap-2">
				<span className="text-muted-foreground/80 text-sm font-bold uppercase">
					{eventTypeLabel}
				</span>
				{speaker && (
					<span className="text-foreground font-medium">
						{speaker.name}
					</span>
				)}
			</div>

			{isLive(dateFrom) ? (
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
						{formatFriendlyDate(dateFrom, !!speaker)}
					</p>
				</div>
			)}
		</div>
	);
}
