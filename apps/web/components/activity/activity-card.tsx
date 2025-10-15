import Link from "next/link";

// Icons
import {
	ArrowRight,
	Calendar,
	Clock,
	Users,
	BookOpen,
	Check,
	User,
} from "lucide-react";

// Components
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

// Types
import { RouterOutput } from "@verific/api";

// Lib
import { cn } from "@/lib/utils";
import { getDateString, getTimeString } from "@/lib/date";
import { activityCategoryLabels } from "@verific/drizzle/schema";

interface EventCardProps {
	activity: RouterOutput["getActivities"]["activities"][number];
	userId?: string | null;
}

export function ActivityCard({ activity, userId }: EventCardProps) {
	const isParticipant = activity.participants?.some(
		(participant) => participant.userId === userId,
	);
	const hasRemainingSeats = activity.participantsLimit
		? activity.participantsLimit - activity.participants.length > 0
		: true;

	return (
		<div
			id={activity.id}
			className={`bg-card flex h-full flex-col justify-between rounded-lg border p-6`}
		>
			<ActivityCardContent activity={activity} />
			<div className="mt-auto flex flex-col flex-wrap items-start justify-center gap-4 md:flex-row-reverse md:items-center md:justify-between">
				<ActivityCardTags activity={activity} />
				<Button
					variant={"default"}
					size={"lg"}
					className={cn({
						"pointer-events-none opacity-50":
							!hasRemainingSeats || isParticipant,
					})}
					asChild
				>
					<Link
						href={`/${activity.project?.url}/schedule/${activity.id}`}
						scroll={false}
					>
						{isParticipant ? (
							<>
								<Check className="mr-2 h-4 w-4" />
								Inscrito
							</>
						) : (
							<>
								Quero participar
								<ArrowRight className="ml-2 h-4 w-4" />
							</>
						)}
					</Link>
				</Button>
			</div>
		</div>
	);
}

function ActivityCardContent({
	activity,
}: {
	activity: EventCardProps["activity"];
}) {
	const remainingSeats = activity.participantsLimit
		? activity.participantsLimit - activity.participants.length
		: null;

	/* console.log("ActivityCardContent", {
		activity,
		remainingSeats,
	}); */

	return (
		<div>
			<div className="mb-2 flex items-start justify-between">
				<span className="text-sm font-extrabold uppercase">
					{activityCategoryLabels[activity.category]}
				</span>
				<span
					className={cn("text-muted-foreground text-sm", {
						"opacity-50": !remainingSeats || remainingSeats <= 0,
						"animate-pulse":
							remainingSeats &&
							remainingSeats > 0 &&
							remainingSeats <= 2,
						"text-red-500 uppercase":
							remainingSeats && remainingSeats === 0,
					})}
				>
					{remainingSeats !== null
						? remainingSeats === 0
							? "Vagas Esgotadas"
							: remainingSeats > 4
								? `${remainingSeats} vagas`
								: "[Últimas vagas!"
						: "Vagas Ilimitadas"}
				</span>
			</div>
			<h3 className="mb-2 text-lg font-bold">{activity.name}</h3>
			<p className="text-muted-foreground mb-4 text-sm">
				{activity.description}
			</p>

			{activity.speaker && (
				<ActivityCardSpeaker speaker={activity.speaker} />
			)}
		</div>
	);
}

export function ActivityCardSpeaker({
	speaker,
}: {
	speaker: NonNullable<EventCardProps["activity"]["speaker"]>;
}) {
	return (
		<div
			className={cn(
				"mb-4 flex items-center gap-3 rounded-lg border px-6 py-3",
				{
					"px-3": !speaker.imageUrl,
				},
			)}
		>
			<Avatar
				className={cn("aspect-square h-10 w-10 object-cover", {
					"h-6 w-6": !speaker.imageUrl,
				})}
			>
				<AvatarImage src={speaker.imageUrl || undefined} />
				<AvatarFallback>
					<User
						className={cn("h-6 w-6 text-white", {
							"h-4 w-4": !speaker.imageUrl,
						})}
					/>
				</AvatarFallback>
			</Avatar>
			<div>
				<p className="text-sm font-medium">{speaker.name}</p>
				<p className="text-muted-foreground text-xs">
					{speaker.description}
				</p>
			</div>
		</div>
	);
}

export function ActivityCardTags({
	activity,
}: {
	activity: Omit<
		EventCardProps["activity"],
		"participants" | "project" | "speaker"
	>;
}) {
	const displayDate = getDateString(activity);
	const displayTime = getTimeString(activity.dateFrom);

	return (
		<div className="flex flex-wrap gap-2">
			<Badge className="bg-background text-foreground py-1 brightness-95">
				<Calendar className="mr-2 !h-3.5 !w-3.5" />
				<span className="-mt-0.5 text-sm">{displayDate}</span>
			</Badge>
			<Badge className="bg-background text-foreground py-1 brightness-95">
				<Clock className="mr-2 !h-3.5 !w-3.5" />
				<span className="-mt-0.5 text-sm">{displayTime}</span>
			</Badge>
			{activity.workload ? (
				<Badge className="bg-background text-foreground py-1 brightness-95">
					<BookOpen className="mr-2 !h-3.5 !w-3.5" />
					<span className="-mt-0.5 text-sm">
						{activity.workload}h
					</span>
				</Badge>
			) : null}
			<Badge className="bg-background text-foreground py-1 brightness-95">
				<Users className="mr-2 !h-3.5 !w-3.5" />
				<span className="-mt-0.5 text-sm capitalize">
					{activity.audience === "internal" ? "Interno" : "Externo"}
				</span>
			</Badge>
		</div>
	);
}
