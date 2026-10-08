"use client";

import Link from "next/link";

// Icons
import { ArrowRight, CalendarClock, Check } from "lucide-react";

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
import {
	getQuickJoinEligibility,
	type QuickJoinMembership,
} from "@/lib/quick-join";
import { cn } from "@/lib/utils";

import { TagBadges } from "../tag-badge";
import { ActivitySpeakers } from "./speakers";
import { ActivityCardTags } from "./tags";

import type { Conflict } from "@/lib/schedule/conflicts";

type CardActivity = RouterOutput["getActivities"]["activities"][number];

interface EventCardProps {
	className?: string;
	activity: CardActivity;
	/** Definido quando o usuário já está inscrito NESTA atividade. */
	participantId?: string;
	userId?: string;
	/** Vínculo com o evento (para a elegibilidade), mesmo sem inscrição aqui. */
	eventParticipantId?: string | null;
	subscribedIds?: string[];
	/** Abre o diálogo de confirmação em vez de navegar. */
	onQuickJoin?: (activity: CardActivity) => void;
	/** Delta otimista de vagas aplicado após o próprio join (+1). */
	seatDelta?: number;
	/** Resposta do servidor em corrida: força o estado do card. */
	statusOverride?: "full" | "closed" | null;
	/** Conflitos com atividades já inscritas (só exibição, nunca bloqueia). */
	conflicts?: Conflict[];
	lowSeatsThreshold?: number;
	/** When rendered as one day of a multi-session activity. */
	occurrenceSession?: ActivitySessionLike | null;
	occurrenceLabel?: string | null;
}

export function ActivityCard({
	activity,
	participantId,
	userId,
	eventParticipantId,
	subscribedIds,
	onQuickJoin,
	seatDelta = 0,
	statusOverride = null,
	conflicts = [],
	className,
	lowSeatsThreshold = 7,
	occurrenceSession,
	occurrenceLabel,
}: EventCardProps) {
	const seats = describeSeats({
		participantsLimit: activity.participantsLimit,
		participantsCount: activity.participantsCount + seatDelta,
		lowSeatsThreshold,
	});

	const isFull = statusOverride === "full" || seats.status === "full";
	const isOpen = activity.isRegistrationOpen && statusOverride !== "closed";
	const hasEnded = hasEverySessionEnded(activity.sessions);

	const membership: QuickJoinMembership = {
		userId,
		participantId: eventParticipantId ?? participantId,
		subscribedIds,
		conflicts,
	};
	const quickJoinEligible =
		Boolean(onQuickJoin) &&
		!participantId &&
		getQuickJoinEligibility(
			{
				...activity,
				participantsCount: activity.participantsCount + seatDelta,
			},
			membership,
		);

	const pageHref = `/${activity.project?.url}/schedule/${activity.id}`;

	// Bloqueio por conflito: só quando o botão de inscrição renderizaria
	// (vaga, aberta, não inscrito, não encerrada) — aí o primário some e
	// entra o tratamento bloqueado; fora disso vale a dica genérica.
	const showJoinButton = (activity.workload ?? 0) > 0 && isOpen;
	const showConflictBlock =
		showJoinButton && !participantId && conflicts.length > 0;

	return (
		<div
			id={activity.id}
			tabIndex={-1}
			className={cn(
				"bg-card flex flex-col justify-between gap-4 rounded-lg border p-6 outline-none",
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
							"opacity-50": isFull,
							"animate-pulse font-bold":
								seats.status === "low" && !isFull,
							"text-destructive uppercase": isFull,
						})}
					>
						{isFull ? "Esgotado" : (seats.label ?? "")}
					</span>
				</div>

				<h3 className="text-lg font-bold">
					<Link
						href={pageHref}
						className="focus-visible:ring-ring/50 rounded-sm outline-none hover:underline focus-visible:ring-[3px]"
					>
						{activity.name}
					</Link>
				</h3>
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
				{conflicts.length > 0 && !showConflictBlock ? (
					<p className="text-muted-foreground flex w-full items-center gap-1.5 text-sm">
						<CalendarClock className="size-4 shrink-0" />
						Conflito de horário
					</p>
				) : null}
				<div className="flex flex-row flex-wrap items-center justify-start gap-4">
					{showJoinButton ? (
						participantId ? (
							<Button
								variant={"default"}
								size={"lg"}
								className={cn({
									"pointer-events-none opacity-50":
										isFull || !!participantId,
								})}
								asChild
							>
								<Link href={pageHref}>
									<Check className="mr-2 h-4 w-4" />
									Inscrito
								</Link>
							</Button>
						) : showConflictBlock ? (
							<>
								<p className="text-muted-foreground text-sm">
									Conflita com{" "}
									{conflicts[0]!.otherActivity.name}
									{conflicts.length > 1
										? ` e mais ${conflicts.length - 1}`
										: ""}
								</p>
								<Button
									type="button"
									variant={"outline"}
									size={"sm"}
									asChild
								>
									<Link href={pageHref}>Ver detalhes</Link>
								</Button>
							</>
						) : quickJoinEligible ? (
							<>
								<Button
									type="button"
									variant={"default"}
									size={"lg"}
									aria-haspopup="dialog"
									onClick={() => onQuickJoin?.(activity)}
								>
									Quero participar
									<ArrowRight className="ml-2 h-4 w-4" />
								</Button>
								<Button
									type="button"
									variant={"ghost"}
									size={"sm"}
									asChild
								>
									<Link href={pageHref}>Ver detalhes</Link>
								</Button>
							</>
						) : (
							<Button
								variant={"default"}
								size={"lg"}
								className={cn({
									"pointer-events-none opacity-50": isFull,
								})}
								asChild
							>
								<Link href={pageHref}>
									Quero participar
									<ArrowRight className="ml-2 h-4 w-4" />
								</Link>
							</Button>
						)
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
	);
}
