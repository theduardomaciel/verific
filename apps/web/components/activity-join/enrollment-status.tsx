"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

// Icons
import {
	BookLock,
	CalendarClock,
	Check,
	CheckCircle2,
	CircleSlash,
	InfoIcon,
	LogIn,
	TicketX,
} from "lucide-react";

// Components
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { ParticipantQuitButton } from "@/components/participant/participant-quit-button";

// Lib
import {
	getSessionsDateString,
	getSessionsSorted,
	hasEverySessionEnded,
	type ActivitySessionLike,
} from "@/lib/date";
import { cn } from "@/lib/utils";

// Types
import type { ActivityDetail } from "./use-activity-enrollment-state";

function sessionsSummary(
	sessions: ActivitySessionLike[] | undefined | null,
): string | null {
	const sorted = getSessionsSorted(sessions);
	if (sorted.length === 0) return null;
	const range = getSessionsDateString(sorted);
	if (sorted.length === 1) return range;
	return `${sorted.length} encontros · ${range}`;
}

function StatusShell({
	icon,
	title,
	message,
	action,
	tone = "muted",
}: {
	icon: React.ReactNode;
	title: string;
	message: string;
	action?: React.ReactNode;
	tone?: "muted" | "success";
}) {
	return (
		<div className="flex flex-col items-start gap-4">
			<div className="flex items-start gap-4">
				<span
					className={cn(
						"flex size-10 shrink-0 items-center justify-center rounded-full",
						tone === "success"
							? "bg-primary/10 text-primary"
							: "bg-muted text-muted-foreground",
					)}
				>
					{icon}
				</span>
				<div className="flex flex-col gap-1">
					<p className="text-sm font-bold">{title}</p>
					<p className="text-muted-foreground text-sm">{message}</p>
				</div>
			</div>
			{action ? <div className="w-full">{action}</div> : null}
		</div>
	);
}

export function SignedOutStatus({ returnUrl }: { returnUrl: string }) {
	return (
		<StatusShell
			icon={<LogIn className="h-5 w-5" />}
			title="Entre para se inscrever"
			message="Você precisa estar logado para participar desta atividade."
			action={
				<Button asChild size="lg" className="w-full">
					<Link
						href={`/auth?callbackUrl=${encodeURIComponent(returnUrl)}`}
					>
						Entrar
					</Link>
				</Button>
			}
		/>
	);
}

export function NotInEventStatus({ eventUrl }: { eventUrl: string }) {
	return (
		<StatusShell
			icon={<BookLock className="h-5 w-5" />}
			title="Inscreva-se no evento primeiro"
			message="É necessário estar inscrito no evento para participar desta atividade."
			action={
				<Button asChild size="lg" className="w-full">
					<Link href={`/${eventUrl}/subscribe`}>
						Inscrever-se no evento
					</Link>
				</Button>
			}
		/>
	);
}

export function AlreadySubscribedStatus({
	activity,
	userId,
	participantId,
	projectUrl,
}: {
	activity: ActivityDetail;
	userId: string;
	participantId: string;
	projectUrl: string;
}) {
	const summary = sessionsSummary(activity.sessions);
	const hasEnded = hasEverySessionEnded(activity.sessions);

	return (
		<div className="flex flex-col gap-4">
			<StatusShell
				tone="success"
				icon={<Check className="h-5 w-5" />}
				title="Você está inscrito"
				message={
					summary
						? `Sua vaga está garantida · ${summary}.`
						: "Sua vaga está garantida nesta atividade."
				}
			/>
			{!hasEnded ? (
				<ParticipantQuitButton
					activityId={activity.id}
					userId={userId}
					participantId={participantId}
					projectUrl={projectUrl}
				/>
			) : null}
		</div>
	);
}

const mutedCopy: Record<
	"ended" | "registration-closed" | "full",
	{ title: string; message: string }
> = {
	ended: {
		title: "Atividade encerrada",
		message: "Esta atividade já foi encerrada.",
	},
	"registration-closed": {
		title: "Inscrições encerradas",
		message: "As inscrições para esta atividade estão encerradas.",
	},
	full: {
		title: "Vagas esgotadas",
		message: "Vagas esgotadas.",
	},
};

export function MutedStatus({ kind }: { kind: keyof typeof mutedCopy }) {
	const copy = mutedCopy[kind];
	const Icon =
		kind === "full"
			? TicketX
			: kind === "ended"
				? CalendarClock
				: CircleSlash;

	return (
		<StatusShell
			icon={<Icon className="h-5 w-5" />}
			title={copy.title}
			message={copy.message}
		/>
	);
}

/**
 * Aviso de fila de espera: sempre visível no corpo do painel, nunca
 * atrás de tooltip (inalcançável no toque e no teclado).
 */
export function WaitlistNotice({ tolerance }: { tolerance: number }) {
	return (
		<Alert>
			<InfoIcon className="h-4 w-4" />
			<AlertTitle>Fila de espera</AlertTitle>
			<AlertDescription>
				Este evento possui fila de espera. Caso não haja confirmação de
				sua presença em {tolerance}m a partir do início da atividade,
				sua vaga será cedida a outra pessoa.
			</AlertDescription>
		</Alert>
	);
}

export function EnrollmentSuccess({
	activityName,
	sessions,
	scheduleHref,
}: {
	activityName: string;
	sessions: ActivitySessionLike[] | undefined | null;
	scheduleHref: string;
}) {
	const headingRef = useRef<HTMLHeadingElement>(null);
	const summary = sessionsSummary(sessions);

	useEffect(() => {
		headingRef.current?.focus();
	}, []);

	return (
		<div aria-live="polite" className="flex flex-col items-start gap-4">
			<span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
				<CheckCircle2 className="h-5 w-5" />
			</span>
			<h2
				ref={headingRef}
				tabIndex={-1}
				className="font-heading text-xl font-bold"
			>
				Inscrição confirmada!
			</h2>
			<p className="text-muted-foreground text-sm">
				Você está inscrito em {activityName}.
				{summary ? ` ${summary}.` : ""}
			</p>
			<Button asChild size="lg" className="w-full">
				<Link href={scheduleHref}>Voltar para a programação</Link>
			</Button>
		</div>
	);
}
