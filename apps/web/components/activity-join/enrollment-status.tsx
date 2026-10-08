"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

// Icons
import {
	BellRing,
	BookLock,
	CalendarClock,
	Check,
	CheckCircle2,
	CircleSlash,
	Hourglass,
	InfoIcon,
	Loader2,
	LogIn,
	TicketX,
} from "lucide-react";

// Components
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { ConflictList } from "@/components/activity/conflict-list";
import { ParticipantQuitButton } from "@/components/participant/participant-quit-button";

// Lib
import {
	formatFriendlyDate,
	getSessionsDateString,
	getSessionsSorted,
	hasEverySessionEnded,
	type ActivitySessionLike,
} from "@/lib/date";
import { cn } from "@/lib/utils";

// Types
import type { ActivityDetail } from "./use-activity-enrollment-state";
import type { Conflict } from "@/lib/schedule/conflicts";

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
	"ended" | "registration-closed",
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
};

export function MutedStatus({ kind }: { kind: keyof typeof mutedCopy }) {
	const copy = mutedCopy[kind];
	const Icon = kind === "ended" ? CalendarClock : CircleSlash;

	return (
		<StatusShell
			icon={<Icon className="h-5 w-5" />}
			title={copy.title}
			message={copy.message}
		/>
	);
}

/**
 * Bloqueio por conflito de horário: padrão calmo dos estados
 * não-acionáveis (nunca destrutivo — não é erro). Só os links da lista
 * são ação; sem botão de saída inline.
 */
export function ScheduleConflictStatus({
	conflicts,
	eventUrl,
}: {
	conflicts: Conflict[];
	eventUrl: string;
}) {
	return (
		<div className="flex flex-col items-start gap-4">
			<div className="flex items-start gap-4">
				<span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
					<CalendarClock className="h-5 w-5" />
				</span>
				<div className="flex flex-col gap-1">
					<p className="text-sm font-bold">Conflito de horário</p>
					<p className="text-muted-foreground text-sm">
						Você já está inscrito em outra atividade no mesmo
						horário. Cancele essa inscrição para participar desta.
					</p>
				</div>
			</div>
			<ConflictList conflicts={conflicts} eventUrl={eventUrl} />
		</div>
	);
}

/**
 * Aviso de tolerância: sempre visível no corpo do painel, nunca atrás de
 * tooltip (inalcançável no toque e no teclado).
 */
export function ToleranceNotice({ tolerance }: { tolerance: number }) {
	return (
		<Alert>
			<InfoIcon className="h-4 w-4" />
			<AlertTitle>Tolerância de {tolerance} min</AlertTitle>
			<AlertDescription>
				Caso não haja confirmação de sua presença em {tolerance}m a
				partir do início da atividade, sua vaga será cedida a outra
				pessoa.
			</AlertDescription>
		</Alert>
	);
}

/** Atividade lotada: o formulário abaixo coloca a pessoa na fila. */
export function WaitlistIntro({ offerHours }: { offerHours: number }) {
	return (
		<StatusShell
			icon={<TicketX className="h-5 w-5" />}
			title="Vagas esgotadas"
			message={`Entre na fila de espera. Se uma vaga abrir, ela será oferecida a você pela ordem de chegada, e você terá até ${offerHours}h para confirmar.`}
		/>
	);
}

export function WaitlistedStatus({
	position,
	offerHours,
	onLeave,
	leaving,
}: {
	position: number | null;
	offerHours: number;
	onLeave: () => void;
	leaving: boolean;
}) {
	return (
		<StatusShell
			icon={<Hourglass className="h-5 w-5" />}
			title={
				position
					? `Você está na fila: ${position}º lugar`
					: "Você está na fila de espera"
			}
			message={`Quando uma vaga abrir, ela será oferecida a você e você terá até ${offerHours}h para confirmar. Volte a esta página para acompanhar.`}
			action={
				<Button
					variant="outline"
					size="lg"
					className="w-full"
					disabled={leaving}
					aria-busy={leaving}
					onClick={onLeave}
				>
					{leaving ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : null}
					Sair da fila
				</Button>
			}
		/>
	);
}

export function OfferStatus({
	expiresAt,
	conflicts,
	eventUrl,
	onConfirm,
	onDecline,
	pending,
}: {
	expiresAt: Date | null;
	conflicts: Conflict[];
	eventUrl: string;
	onConfirm: () => void;
	onDecline: () => void;
	pending: "confirm" | "leave" | null;
}) {
	const deadline = expiresAt
		? ` Prazo: ${formatFriendlyDate(new Date(expiresAt), { includeHour: true })}.`
		: "";
	const blocked = conflicts.length > 0;

	return (
		<StatusShell
			tone="success"
			icon={<BellRing className="h-5 w-5" />}
			title="Uma vaga abriu para você"
			message={
				blocked
					? `Para confirmar, cancele antes a inscrição que ocupa o mesmo horário.${deadline}`
					: `Confirme para garantir sua vaga.${deadline}`
			}
			action={
				<div className="flex flex-col gap-2">
					{blocked ? (
						<ConflictList
							conflicts={conflicts}
							eventUrl={eventUrl}
						/>
					) : null}
					<Button
						size="lg"
						className="w-full"
						disabled={pending !== null || blocked}
						aria-busy={pending === "confirm"}
						onClick={onConfirm}
					>
						{pending === "confirm" ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : null}
						Confirmar vaga
					</Button>
					<Button
						variant="outline"
						size="lg"
						className="w-full"
						disabled={pending !== null}
						aria-busy={pending === "leave"}
						onClick={onDecline}
					>
						Recusar
					</Button>
				</div>
			}
		/>
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
