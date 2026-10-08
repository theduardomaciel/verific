"use client";

import { useState } from "react";

// Lib
import { describeSeats } from "@/lib/activity-seats";

// Components
import { ActivityEnrollmentForm } from "./activity-enrollment-form";
import {
	AlreadySubscribedStatus,
	EnrollmentSuccess,
	MutedStatus,
	NotInEventStatus,
	ScheduleConflictStatus,
	SignedOutStatus,
	WaitlistNotice,
} from "./enrollment-status";
import { MobileActionBar } from "./mobile-action-bar";
import { EnrollmentPanelSkeleton } from "./page-skeleton";
// Types
import {
	useActivityEnrollmentState,
	type ActivityDetail,
} from "./use-activity-enrollment-state";

export const ENROLLMENT_CARD_ID = "inscricao-card";
export const ENROLLMENT_HEADING_ID = "inscricao-heading";

interface ActivityEnrollmentPanelProps {
	activity: ActivityDetail;
	eventUrl: string;
	participantsCount: number | null;
}

/**
 * Dono único de todos os estados da inscrição: carrega sessão,
 * vínculo e formulário pelo hook e renderiza um estado por vez —
 * sem diálogos de loading/sucesso/erro.
 */
export function ActivityEnrollmentPanel({
	activity,
	eventUrl,
	participantsCount,
}: ActivityEnrollmentPanelProps) {
	const [submitted, setSubmitted] = useState(false);
	const enrollment = useActivityEnrollmentState({
		activity,
		eventUrl,
		participantsCount,
	});

	const { state, userId, participantId } = enrollment;
	const scheduleHref = `/${eventUrl}/schedule#${activity.id}`;
	const seats = describeSeats({
		participantsLimit: activity.participantsLimit,
		participantsCount,
	});

	const isActionable = state === "form" && !submitted;

	return (
		<>
			<aside
				id={ENROLLMENT_CARD_ID}
				aria-labelledby={ENROLLMENT_HEADING_ID}
				className="bg-card w-full scroll-mt-24 self-start rounded-lg border p-6 text-sm shadow-sm lg:sticky lg:top-24"
			>
				<h2
					id={ENROLLMENT_HEADING_ID}
					tabIndex={-1}
					className="font-heading text-xl font-bold"
				>
					Inscrição
				</h2>

				<div className="mt-4 motion-safe:transition-opacity motion-safe:duration-200">
					{state === "loading" ? (
						<EnrollmentPanelSkeleton />
					) : submitted ? (
						<EnrollmentSuccess
							activityName={activity.name}
							sessions={activity.sessions}
							scheduleHref={scheduleHref}
						/>
					) : state === "signed-out" ? (
						<SignedOutStatus
							returnUrl={`/${eventUrl}/schedule/${activity.id}`}
						/>
					) : state === "not-in-event" ? (
						<NotInEventStatus eventUrl={eventUrl} />
					) : state === "already-subscribed" ? (
						<AlreadySubscribedStatus
							activity={activity}
							userId={userId ?? ""}
							participantId={participantId ?? ""}
							projectUrl={activity.project?.url ?? eventUrl}
						/>
					) : state === "ended" ||
					  state === "registration-closed" ||
					  state === "full" ? (
						<div className="flex flex-col gap-4">
							<MutedStatus kind={state} />
							{state === "full" && activity.tolerance ? (
								<WaitlistNotice
									tolerance={activity.tolerance}
								/>
							) : null}
						</div>
					) : state === "schedule-conflict" ? (
						<ScheduleConflictStatus
							conflicts={enrollment.conflicts}
							eventUrl={eventUrl}
						/>
					) : (
						<div className="flex flex-col gap-4">
							<p className="text-muted-foreground text-sm">
								{enrollment.hasForm
									? "Preencha as informações abaixo para confirmar sua vaga."
									: "Nenhuma informação adicional é necessária: confirme abaixo para garantir sua vaga."}
							</p>
							<ActivityEnrollmentForm
								activity={activity}
								participantId={participantId ?? ""}
								userId={userId ?? ""}
								form={enrollment.form}
								onSubmitted={() => setSubmitted(true)}
							/>
						</div>
					)}
				</div>
			</aside>

			<MobileActionBar
				cardId={ENROLLMENT_CARD_ID}
				headingId={ENROLLMENT_HEADING_ID}
				seatsLabel={seats.label}
				seatsUrgent={seats.status === "low" || seats.status === "full"}
				hidden={!isActionable}
			/>
		</>
	);
}
