import Link from "next/link";

// Icons
import { ArrowRight, Check } from "lucide-react";

import { cn } from "@/lib/utils";

// Components
import { Button } from "@/components/ui/button";
import { ParticipantQuitButton } from "@/components/participant/participant-quit-button";
import { ActivitySpeakers } from "./speakers";
import { ActivityCardTags } from "./tags";

// Types
import { RouterOutput } from "@verific/api";

// Lib
import { activityCategoryLabels } from "@verific/drizzle/schema";

interface EventCardProps {
	activity: RouterOutput["getActivities"]["activities"][number];
	userId?: string | null;
}

export function ActivityCard({ activity, userId }: EventCardProps) {
	const participantRole = activity.participants.find(
		(participant) => participant.userId === userId,
	)?.role;

	const remainingSeats = activity.participantsLimit
		? activity.participantsLimit -
			activity.participants.filter(
				(participant) => participant.role === "participant",
			).length
		: null;

	const hasRemainingSeats = remainingSeats === null || remainingSeats > 0;
	const hasFewRemainingSeats =
		remainingSeats !== null && remainingSeats > 0 && remainingSeats <= 2;

	return (
		<div
			id={activity.id}
			className={`bg-card flex h-full flex-col justify-between gap-4 rounded-lg border p-6`}
		>
			<div className="flex flex-col gap-2">
				<div className="flex items-start justify-between">
					<span className="text-sm font-extrabold uppercase">
						{activityCategoryLabels[activity.category]}
					</span>
					<span
						className={cn("text-muted-foreground text-sm", {
							"opacity-50":
								remainingSeats !== null && remainingSeats <= 0,
							"animate-pulse":
								remainingSeats !== null &&
								remainingSeats > 0 &&
								remainingSeats <= 2,
							"text-red-500 uppercase":
								remainingSeats !== null && remainingSeats === 0,
						})}
					>
						{remainingSeats === null
							? "Vagas ilimitadas"
							: remainingSeats > 0
								? `${remainingSeats} vagas restantes`
								: "Esgotado"}
					</span>
				</div>

				<h3 className="text-lg font-bold">{activity.name}</h3>
				{activity.description && (
					<p className="text-muted-foreground leading-relaxe line-clamp-3 text-base text-ellipsis">
						{activity.description}
					</p>
				)}
			</div>

			{activity.speakers.length ? (
				<ActivitySpeakers speakers={activity.speakers} />
			) : null}

			<div className="mt-auto flex flex-col flex-wrap items-start justify-center gap-4 md:flex-row-reverse md:items-center md:justify-between">
				<ActivityCardTags activity={activity} />
				<div className="flex flex-row items-center justify-start gap-4">
					{activity.workload &&
					activity.workload > 0 &&
					activity.isRegistrationOpen ? (
						<Button
							variant={"default"}
							size={"lg"}
							className={cn({
								"pointer-events-none opacity-50":
									!hasRemainingSeats || !!participantRole,
							})}
							asChild
						>
							<Link
								href={`/${activity.project?.url}/schedule/${activity.id}`}
								scroll={false}
							>
								{!!participantRole ? (
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
					) : null}
					{participantRole === "participant" && (
						<ParticipantQuitButton
							activityId={activity.id}
							eventUrl={activity.project?.url}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
