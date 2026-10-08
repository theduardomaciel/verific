"use client";

import Link from "next/link";

// Icons
import { ArrowRight, Check } from "lucide-react";

// Types
import type { RouterOutput } from "@verific/api";
// Lib
import { activityCategoryLabels } from "@verific/drizzle/schema";

// Components
import { Button } from "@/components/ui/button";

import { ParticipantQuitButton } from "@/components/participant/participant-quit-button";
import { ExpandableDescription } from "@/components/shared/expandable-description";

import { describeSeats } from "@/lib/activity-seats";
import { hasEverySessionEnded, type ActivitySessionLike } from "@/lib/date";
import { cn } from "@/lib/utils";

import { TagBadges } from "../tag-badge";
import { ActivitySpeakers } from "./speakers";
import { ActivityCardTags } from "./tags";

interface EventCardProps {
	className?: string;
	activity: RouterOutput["getActivities"]["activities"][number];
	participantId?: string;
	userId?: string;
	lowSeatsThreshold?: number;
	/** When rendered as one day of a multi-session activity. */
	occurrenceSession?: ActivitySessionLike | null;
	occurrenceLabel?: string | null;
}

export function ActivityCard({
	activity,
	participantId,
	userId,
	className,
	lowSeatsThreshold = 7,
	occurrenceSession,
	occurrenceLabel,
}: EventCardProps) {
	const seats = describeSeats({
		participantsLimit: activity.participantsLimit,
		participantsCount: activity.participantsCount,
		lowSeatsThreshold,
	});

	const hasRemainingSeats = seats.status !== "full";
	const hasEnded = hasEverySessionEnded(activity.sessions);

	return (
		<>
			<div
				id={activity.id}
				className={cn(
					"bg-card flex flex-col justify-between gap-4 rounded-lg border p-6",
					{
						"pointer-events-none opacity-50 select-none": hasEnded,
					},
					className,
				)}
			>
				<div className="flex flex-col gap-2">
					<div className="flex items-start justify-between">
						<span className="text-sm font-extrabold uppercase">
							{activityCategoryLabels[activity.category]}
						</span>
						<span
							className={cn("text-muted-foreground text-sm", {
								"opacity-50": seats.status === "full",
								"animate-pulse font-bold":
									seats.status === "low",
								"text-destructive uppercase":
									!hasRemainingSeats,
							})}
						>
							{seats.label ?? ""}
						</span>
					</div>

					<h3 className="text-lg font-bold">{activity.name}</h3>
					{occurrenceLabel ? (
						<span className="text-muted-foreground text-sm font-medium">
							{occurrenceLabel}
						</span>
					) : null}
					<TagBadges tags={activity.tags ?? []} />
					{activity.description && (
						<ExpandableDescription activity={activity} />
					)}
				</div>

				{activity.speakers.length ? (
					<ActivitySpeakers speakers={activity.speakers} />
				) : null}

				<div className="mt-auto flex flex-col flex-wrap items-start justify-center gap-4 md:flex-row-reverse md:items-center md:justify-between">
					<ActivityCardTags
						activity={activity}
						highlightSession={occurrenceSession}
					/>
					<div className="flex flex-row items-center justify-start gap-4">
						{activity.workload &&
						activity.workload > 0 &&
						activity.isRegistrationOpen ? (
							<Button
								variant={"default"}
								size={"lg"}
								className={cn({
									"pointer-events-none opacity-50":
										!hasRemainingSeats || !!participantId,
								})}
								asChild
							>
								<Link
									href={`/${activity.project?.url}/schedule/${activity.id}`}
								>
									{participantId ? (
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
						{!!participantId && !!userId && !hasEnded && (
							<ParticipantQuitButton
								activityId={activity.id}
								userId={userId}
								participantId={participantId}
								projectUrl={activity.project?.url}
							/>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
