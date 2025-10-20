"use client";

import Link from "next/link";

// Icons
import { ArrowRight, Check } from "lucide-react";

import { cn } from "@/lib/utils";

// Components
import { Button } from "@/components/ui/button";
import { ParticipantQuitButton } from "@/components/participant/participant-quit-button";
import { ActivitySpeakers } from "./speakers";
import { ActivityCardTags } from "./tags";
import { ExpandableDescription } from "@/components/shared/expandable-description";

// Types
import { RouterOutput } from "@verific/api";

// Lib
import { activityCategoryLabels } from "@verific/drizzle/schema";

interface EventCardProps {
	className?: string;
	activity: RouterOutput["getActivities"]["activities"][number];
	participantId?: string;
	userId?: string;
	lowSeatsThreshold?: number;
}

export function ActivityCard({
	activity,
	participantId,
	userId,
	className,
	lowSeatsThreshold = 7,
}: EventCardProps) {
	const remainingSeats = activity.participantsLimit
		? activity.participantsLimit - activity.participantsCount
		: null;

	const hasRemainingSeats = remainingSeats === null || remainingSeats > 0;

	return (
		<>
			<div
				id={activity.id}
				className={cn(
					"bg-card flex flex-col justify-between gap-4 rounded-lg border p-6",
					{
						"pointer-events-none opacity-50 select-none":
							new Date(activity.dateTo) < new Date(),
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
								"opacity-50":
									remainingSeats !== null &&
									remainingSeats <= 0,
								"animate-pulse font-bold":
									remainingSeats !== null &&
									remainingSeats > 0 &&
									remainingSeats <= lowSeatsThreshold,
								"text-red-500 uppercase": !hasRemainingSeats,
							})}
						>
							{remainingSeats === null
								? ""
								: remainingSeats > lowSeatsThreshold
									? `${remainingSeats} vagas restantes`
									: remainingSeats > 0
										? "Últimas vagas!"
										: "Esgotado"}
						</span>
					</div>

					<h3 className="text-lg font-bold">{activity.name}</h3>
					{activity.description && (
						<ExpandableDescription activity={activity} />
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
										!hasRemainingSeats || !!participantId,
								})}
								asChild
							>
								<Link
									href={`/${activity.project?.url}/schedule/${activity.id}`}
									scroll={false}
								>
									{!!participantId ? (
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
						{!!participantId &&
							!!userId &&
							new Date(activity.dateTo) > new Date() && (
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
