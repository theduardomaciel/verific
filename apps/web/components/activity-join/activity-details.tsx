"use client";

// Icons
import { Calendar, Clock, MapPin } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Lib
import { activityCategoryLabels } from "@verific/drizzle/schema";

// Components
import { Badge } from "@/components/ui/badge";

import { ActivityCardTags } from "@/components/activity/activity-card/tags";
import { TagBadges } from "@/components/activity/tag-badge";

import { describeSeats } from "@/lib/activity-seats";
import {
	getSessionsDateString,
	getSessionsSorted,
	getSessionTimeString,
} from "@/lib/date";
import { cn } from "@/lib/utils";

import { SpeakersList } from "./speakers-list";

// Types
import type { ActivityDetail } from "./use-activity-enrollment-state";

interface ActivityDetailsProps {
	activity: ActivityDetail;
	participantsCount: number | null;
	className?: string;
}

/**
 * Zona de leitura da página da atividade ("o que é esta atividade?"):
 * categoria + vagas, título, tags, sessões, palestrantes e descrição
 * completa. Pré-renderizada no servidor junto com a página.
 */
export function ActivityDetails({
	activity,
	participantsCount,
	className,
}: ActivityDetailsProps) {
	const seats = describeSeats({
		participantsLimit: activity.participantsLimit,
		participantsCount,
	});
	const sessions = getSessionsSorted(activity.sessions);
	const speakers = (activity.speakerOnActivity ?? []).map((s) => s.speaker);

	return (
		<div className={cn("flex w-full flex-col gap-6", className)}>
			<div className="flex flex-col gap-4">
				<div className="flex items-start justify-between gap-4">
					<div className="flex flex-col gap-3">
						<span className="text-sm font-extrabold uppercase">
							{activityCategoryLabels[activity.category]}
						</span>
						<h1 className="font-heading text-3xl font-bold text-balance md:text-4xl">
							{activity.name}
						</h1>
					</div>

					{seats.label ? (
						/* <span
							className={cn(
								"text-muted-foreground shrink-0 text-sm",
								{
									"animate-pulse font-bold":
										seats.status === "low",
									"text-destructive font-bold uppercase":
										seats.status === "full",
								},
							)}
						>
							{seats.label}
						</span> */
						<Badge
							variant={
								seats.status === "full"
									? "destructive"
									: seats.status === "low"
										? "warning"
										: "default"
							}
							className={cn(
								"shrink-0 py-1 text-sm font-semibold uppercase p-3",
								{
									"animate-pulse ": seats.status === "low",
								},
							)}
						>
							{seats.label}
						</Badge>
					) : null}
				</div>

				<TagBadges tags={activity.tags ?? []} />

				{sessions.length > 1 ? (
					<ul className="flex flex-col gap-2">
						{sessions.map((session, index) => (
							<li
								key={
									(session as { id?: string }).id ??
									`session-${index}`
								}
								className="flex flex-wrap gap-2"
							>
								<Badge className="bg-background text-foreground py-1 wrap-break-word brightness-95">
									<Calendar className="mr-2 h-3.5! w-3.5!" />
									<span className="-mt-0.5 text-sm">
										{getSessionsDateString([session])}
										{` · Sessão ${index + 1} de ${sessions.length}`}
									</span>
								</Badge>
								<Badge className="bg-background text-foreground py-1 wrap-break-word brightness-95">
									<Clock className="mr-2 h-3.5! w-3.5!" />
									<span className="-mt-0.5 text-sm">
										{getSessionTimeString(session)}
									</span>
								</Badge>
								{(session.address ?? activity.address) ? (
									<Badge className="bg-background text-foreground py-1 wrap-break-word brightness-95">
										<MapPin className="mr-2 h-3.5! w-3.5!" />
										<span className="-mt-0.5 text-sm">
											{session.address ??
												activity.address}
										</span>
									</Badge>
								) : null}
							</li>
						))}
					</ul>
				) : (
					<ActivityCardTags activity={activity} />
				)}
			</div>

			{speakers.length > 0 ? (
				<section aria-labelledby="activity-speakers-heading">
					<h2
						id="activity-speakers-heading"
						className="font-heading mb-4 text-xl font-bold"
					>
						Palestrantes
					</h2>
					<SpeakersList speakers={speakers} />
				</section>
			) : null}

			{activity.description ? (
				<section aria-labelledby="activity-about-heading">
					<h2
						id="activity-about-heading"
						className="font-heading mb-4 text-xl font-bold"
					>
						Sobre a atividade
					</h2>
					<div className="prose prose-sm md:prose-base dark:prose-invert max-w-none [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_h4]:text-sm">
						<ReactMarkdown remarkPlugins={[remarkGfm]}>
							{activity.description}
						</ReactMarkdown>
					</div>
				</section>
			) : null}
		</div>
	);
}
