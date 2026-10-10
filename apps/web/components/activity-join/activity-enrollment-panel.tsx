"use client";

import { useState } from "react";

import { toast } from "sonner";

// Hooks
import { useWaitlist } from "@/hooks/use-waitlist";
// Lib
import { describeSeats } from "@/lib/activity-seats";

// Components
import { ActivityEnrollmentForm } from "./activity-enrollment-form";
import {
	AlreadySubscribedStatus,
	EnrollmentSuccess,
	FullStatus,
	MutedStatus,
	NotInEventStatus,
	OfferStatus,
	ScheduleConflictStatus,
	SignedOutStatus,
	WaitlistedStatus,
	WaitlistIntro,
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
	// As vagas acabaram durante o envio (contagem em cache desatualizada)
	const [becameFull, setBecameFull] = useState(false);
	const enrollment = useActivityEnrollmentState({
		activity,
		eventUrl,
		participantsCount,
	});

	const { state: rawState, userId, participantId } = enrollment;
	// A fila pode ter sido desligada depois do primeiro render: lotada sem
	// fila cai em `full`, sem ação de fila.
	const state =
		rawState === "form" && becameFull
			? activity.waitlistEnabled === false
				? "full"
				: "waitlist"
			: rawState;
	const waitlist = useWaitlist({
		activityId: activity.id,
		userId: userId ?? "",
	});
	const offerHours = activity.waitlistOfferHours;

	async function confirmOffer() {
		const { error } = await waitlist.confirm();
		if (error === "conflict") {
			toast.error(
				"Esta atividade conflita com outra em que você já está inscrito.",
			);
		} else if (error) {
			toast.error(
				"Não foi possível confirmar: a oferta pode ter expirado.",
			);
		} else {
			setSubmitted(true);
		}
	}

	async function leaveQueue() {
		const { error } = await waitlist.leave();
		if (error)
			toast.error("Não foi possível sair da fila. Tente novamente.");
	}
	const scheduleHref = `/${eventUrl}/schedule#${activity.id}`;
	const seats = describeSeats({
		participantsLimit: activity.participantsLimit,
		participantsCount,
	});

	const isActionable =
		(state === "form" || state === "waitlist" || state === "offered") &&
		!submitted;
	const actionLabel =
		state === "waitlist"
			? "Entrar na fila"
			: state === "offered"
				? "Confirmar vaga"
				: "Inscrever-se";

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
					) : state === "offered" ? (
						<OfferStatus
							expiresAt={
								enrollment.waitlistEntry?.offerExpiresAt ?? null
							}
							conflicts={enrollment.conflicts}
							eventUrl={eventUrl}
							onConfirm={() => void confirmOffer()}
							onDecline={() => void leaveQueue()}
							pending={
								waitlist.pending === "join"
									? null
									: waitlist.pending
							}
						/>
					) : state === "waitlisted" ? (
						<WaitlistedStatus
							position={
								enrollment.waitlistEntry?.position ?? null
							}
							offerHours={offerHours}
							onLeave={() => void leaveQueue()}
							leaving={waitlist.pending === "leave"}
						/>
					) : state === "ended" || state === "registration-closed" ? (
						<MutedStatus kind={state} />
					) : state === "schedule-conflict" ? (
						<ScheduleConflictStatus
							conflicts={enrollment.conflicts}
							eventUrl={eventUrl}
						/>
					) : state === "full" ? (
						<FullStatus />
					) : state === "waitlist" ? (
						<div className="flex flex-col gap-4">
							<WaitlistIntro offerHours={offerHours} />
							<ActivityEnrollmentForm
								activity={activity}
								participantId={participantId ?? ""}
								userId={userId ?? ""}
								form={enrollment.form}
								mode="waitlist"
								onSubmitted={(result) => {
									if (result === "enrolled")
										setSubmitted(true);
								}}
							/>
						</div>
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
								onFull={() => setBecameFull(true)}
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
				actionLabel={actionLabel}
			/>
		</>
	);
}
