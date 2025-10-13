import Image from "next/image";
import Link from "next/link";

// Icons
import {
	ArrowRight,
	Calendar,
	Clock,
	Users,
	BookOpen,
	Check,
} from "lucide-react";

// Components
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

// Types
import { RouterOutput } from "@verific/api";

// Lib
import { getDateString, getTimeString } from "../../lib/date";
import { cn } from "@/lib/utils";
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
			<div className="mt-auto">
				<Button
					variant={"default"}
					size={"lg"}
					className={cn("w-full", {
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

			<ActivityCardTags activity={activity} />
		</div>
	);
}

export function ActivityCardSpeaker({
	speaker,
}: {
	speaker: NonNullable<EventCardProps["activity"]["speaker"]>;
}) {
	return (
		<div className="mb-4 flex items-center gap-3 rounded-lg border px-6 py-3">
			<div className="h-10 w-10 min-w-10 overflow-hidden rounded-full bg-gray-200">
				<Image
					src="https://i.imgur.com/5Hsj4tJ.jpeg" // TODO: Substituir por imagem real do palestrante
					alt={speaker.name}
					width={40}
					height={40}
					className="min-w-10 object-cover"
				/>
			</div>
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
		<div className="mb-4 flex flex-wrap gap-2">
			<Badge className="bg-muted/50 text-foreground py-1">
				<Calendar className="mr-2 !h-3.5 !w-3.5" />
				<span className="-mt-0.5 text-sm">{displayDate}</span>
			</Badge>
			<Badge className="bg-muted/50 text-foreground py-1">
				<Clock className="mr-2 !h-3.5 !w-3.5" />
				<span className="-mt-0.5 text-sm">{displayTime}</span>
			</Badge>
			{activity.workload ? (
				<Badge className="bg-muted/50 text-foreground py-1">
					<BookOpen className="mr-2 !h-3.5 !w-3.5" />
					<span className="-mt-0.5 text-sm">
						{activity.workload}h
					</span>
				</Badge>
			) : null}
			<Badge className="bg-muted/50 text-foreground py-1">
				<Users className="mr-2 !h-3.5 !w-3.5" />
				<span className="-mt-0.5 text-sm capitalize">
					{activity.audience === "internal" ? "Interno" : "Externo"}
				</span>
			</Badge>
		</div>
	);
}
