"use client";

import Link from "next/link";
import { useState } from "react";

// Icons
import { ArrowRight, Check } from "lucide-react";

import { cn } from "@/lib/utils";

// Components
import { Button } from "@/components/ui/button";
import { ParticipantQuitButton } from "@/components/participant/participant-quit-button";
import { ActivitySpeakers } from "./speakers";
import { ActivityCardTags } from "./tags";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ActivityDetailsContent } from "./content";

// Types
import { RouterOutput } from "@verific/api";

// Lib
import { activityCategoryLabels } from "@verific/drizzle/schema";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";

interface EventCardProps {
	className?: string;
	activity: RouterOutput["getActivities"]["activities"][number];
	userId?: string | null;
	lowSeatsThreshold?: number;
}

export function ActivityCard({
	activity,
	className,
	userId,
	lowSeatsThreshold = 7,
}: EventCardProps) {
	const [showDetailsDialog, setShowDetailsDialog] = useState(false);
	const isDesktop = useMediaQuery("(min-width: 768px)");

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

	// Extract first sentence or limit to 2 lines
	const getTruncatedDescription = (text: string) => {
		if (!text) return "";
		// Find first dot or limit to approximately 2 lines (around 120 characters)
		const firstDotIndex = text.indexOf(".");
		if (firstDotIndex !== -1) {
			return text.substring(0, firstDotIndex + 1);
		}
		// If no dot found, limit to ~120 characters (approximately 2 lines)
		return text.length > 120 ? text.substring(0, 120) + "..." : text;
	};

	const hasMoreDescription =
		activity.description &&
		(activity.description.indexOf(".") !== -1 ||
			activity.description.length > 120);

	const truncatedDescription = getTruncatedDescription(
		activity.description || "",
	);

	return (
		<>
			<div
				id={activity.id}
				className={cn(
					"bg-card flex flex-col justify-between gap-4 rounded-lg border p-6",
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
						<div className="flex flex-col gap-2">
							<p className="text-muted-foreground leading-relaxe line-clamp-3 text-base text-ellipsis">
								{truncatedDescription}
							</p>
							{hasMoreDescription && (
								<Button
									variant="link"
									size="sm"
									className="text-secondary h-auto justify-start p-0"
									onClick={() => setShowDetailsDialog(true)}
								>
									Ler mais
								</Button>
							)}
						</div>
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

			{/* Details Dialog (Desktop) */}
			{isDesktop && (
				<Sheet
					open={showDetailsDialog}
					onOpenChange={setShowDetailsDialog}
				>
					<SheetContent className="sm:max-w-[425px]">
						<SheetHeader className="w-full items-center justify-center text-center">
							<SheetTitle className="w-full text-center">
								Detalhes da Atividade
							</SheetTitle>
						</SheetHeader>
						<div className="flex px-8 py-4 text-center">
							<ActivityDetailsContent activity={activity} />
						</div>
					</SheetContent>
				</Sheet>
			)}

			{/* Details Drawer (Mobile) */}
			{!isDesktop && (
				<Drawer
					open={showDetailsDialog}
					onOpenChange={setShowDetailsDialog}
				>
					<DrawerContent>
						<DrawerHeader className="mb-4 w-full border-b pb-4 text-center">
							<DrawerTitle>Detalhes da Atividade</DrawerTitle>
						</DrawerHeader>
						<div className="overflow-y-scroll px-6 pb-4">
							<ActivityDetailsContent activity={activity} />
						</div>
					</DrawerContent>
				</Drawer>
			)}
		</>
	);
}
