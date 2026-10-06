"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { cn } from "@/lib/utils";

// Icons
import { Check, User, Clock, Frown } from "lucide-react";

// Components
import { BadgeScanner } from "@/components/badge-scanner";
import { ActivityStatus } from "./activity-status";
import { ActivitySpeakers } from "./activity-card/speakers";
import { ExpandableDescription } from "@/components/shared/expandable-description";

// Utils
import {
	formatFriendlyDate,
	getDateString,
	getLastSessionEnd,
	getSessionsSorted,
	getSessionTimeString,
} from "@/lib/date";

// API
import type { RouterOutput } from "@verific/api";

export interface WorkshopTicketProps {
	className?: string;
	activity: RouterOutput["getActivitiesFromParticipant"]["activities"][0];
	participantId: string;
}

const DEFAULT_TOLERANCE = 15; // minutes

export function ActivityTicket({
	activity,
	participantId,
	className,
}: WorkshopTicketProps) {
	const isMonitor = activity.role === "monitor";

	// Congelado na montagem: evita que o selo de expiração oscile em
	// re-renders não relacionados (não há timer).
	const [now] = useState(() => new Date());
	const sessions = getSessionsSorted(activity.sessions);
	const attendedCount = sessions.filter((s) => s.joinedAt).length;

	const lastEnd = getLastSessionEnd(sessions);
	const tolerance = activity.tolerance ?? DEFAULT_TOLERANCE;
	const endDatePlusTolerance = lastEnd
		? new Date(lastEnd.getTime() + tolerance * 60 * 1000)
		: null;
	const isExpired = endDatePlusTolerance ? now > endDatePlusTolerance : false;

	return (
		<div
			className={cn(
				"text-card-foreground relative overflow-hidden rounded-3xl drop-shadow-[5px_5px_10px_rgba(191,191,191,1)] dark:drop-shadow-none",
				className,
			)}
		>
			{/* Main content - flex-col on mobile, flex-row on md+ */}
			<div className="flex flex-1 flex-col md:flex-row">
				{/* Activity Details Section */}
				<div className="bg-card flex flex-1 flex-col gap-4 p-6">
					{/* Header */}
					<div className="flex w-full flex-wrap items-center justify-between gap-2 md:flex-nowrap">
						<h2 className="line-clamp-2 text-2xl leading-tight font-bold wrap-break-word">
							{activity.name}
						</h2>
						<ActivityStatus
							className="mt-1"
							sessions={sessions}
							dateFormat={{
								includeDay: true,
								includeHour: false,
							}}
						/>
					</div>

					{/* Description */}
					{activity.description && (
						<ExpandableDescription activity={activity} />
					)}

					{/* Sessions */}
					<div className="flex w-full flex-col gap-2">
						{sessions.map((session, i) => (
							<div
								key={session.id}
								className="flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2"
							>
								<div className="flex min-w-0 flex-col">
									<span className="text-sm font-semibold">
										{sessions.length > 1
											? `Sessão ${i + 1} · `
											: null}
										{getDateString(
											session.startsAt,
											session.startsAt,
										)}
									</span>
									<span className="text-muted-foreground text-sm">
										{getSessionTimeString(session)}
									</span>
								</div>
								{session.joinedAt ? (
									<span className="flex shrink-0 items-center gap-1 text-sm font-medium text-green-600 dark:text-green-500">
										<Check className="size-4" />
										Presente
									</span>
								) : (
									<span className="text-muted-foreground flex shrink-0 items-center gap-1 text-sm">
										<Clock className="size-4" />
										{formatFriendlyDate(
											new Date(session.startsAt),
											{ includeHour: true },
										)}
									</span>
								)}
							</div>
						))}
					</div>

					{/* Limits and Tolerance */}
					{activity.participantsLimit || activity.tolerance ? (
						<div className="text-muted-foreground flex items-center justify-evenly text-sm">
							{activity.participantsLimit ? (
								<div className="flex items-center">
									<User size={16} className="mr-1" />
									<span>
										{activity.participantsLimit} máx
									</span>
								</div>
							) : null}
							{activity.tolerance ? (
								<div className="flex items-center">
									<Clock size={16} className="mr-1" />
									<span>
										{activity.tolerance} de tolerância
									</span>
								</div>
							) : null}
						</div>
					) : null}

					{/* Speakers */}
					{activity.speakers && activity.role === "participant" && (
						<ActivitySpeakers speakers={activity.speakers} />
					)}

					{/* Monitor: Credentialed Participants Count */}
					{isMonitor ? (
						<div className="mt-auto hidden items-center justify-between border-t pt-4 md:flex">
							<div className="text-muted-foreground flex items-center">
								<User size={18} className="mr-2" />
								<span>Participantes credenciados</span>
							</div>
							<div className="text-2xl font-bold">
								{activity.participantsJoined}
							</div>
						</div>
					) : null}
				</div>

				{/* Decorative Divider */}
				<DecorativeDivider />

				{/* Action/QR Section */}
				<div className="bg-card flex flex-col items-center justify-center px-6 md:w-80 md:pl-0">
					{isExpired ? (
						isMonitor ? (
							<div className="flex flex-col items-center justify-center gap-4 pt-6 pb-8">
								<Frown className="text-muted-foreground h-6 w-6" />
								<p className="text-muted-foreground text-center">
									O prazo para credenciamento desta atividade
									terminou.
								</p>
							</div>
						) : (
							<div className="flex flex-col items-center justify-center gap-4 pt-6 pb-8">
								<Frown className="text-muted-foreground h-6 w-6" />
								<p className="text-muted-foreground text-center">
									Você não confirmou presença nesta atividade
									:(
								</p>
							</div>
						)
					) : isMonitor ? (
						<div className="flex w-full flex-col items-center justify-center gap-4 py-6">
							{sessions.map((session, i) => (
								<div
									key={session.id}
									className="flex w-full flex-col gap-2 rounded-md border px-3 py-2"
								>
									<div className="flex w-full items-center justify-between gap-2 text-sm">
										<span className="font-semibold">
											{sessions.length > 1
												? `Sessão ${i + 1} · `
												: null}
											{getSessionTimeString(session)}
										</span>
										<span className="text-muted-foreground flex shrink-0 items-center gap-1">
											<User size={14} />
											{session.attendedCount}
										</span>
									</div>
									<BadgeScanner
										sessionId={session.id}
										buttonLabel={
											sessions.length > 1
												? `Credenciar sessão ${i + 1}`
												: "Escanear crachás"
										}
									/>
								</div>
							))}
							<div className="flex w-full items-center justify-between">
								<div className="text-muted-foreground flex items-center">
									<User size={18} className="mr-2" />
									<span>Participantes credenciados</span>
								</div>
								<div className="text-2xl font-bold">
									{activity.participantsJoined}
								</div>
							</div>
						</div>
					) : attendedCount > 0 ? (
						<div className="flex w-full items-center justify-between py-8 md:flex-col md:items-center md:justify-center md:border-0 md:pt-0">
							<div className="text-muted-foreground md:text-card-foreground flex items-center md:flex-col md:gap-3 md:text-center">
								<Check className="mr-2 size-6 md:mr-0 md:size-12" />
								<span className="md:mb-2">
									Presença confirmada
								</span>
							</div>
							<div className="text-2xl font-bold md:text-4xl">
								{attendedCount} de {sessions.length}{" "}
								{sessions.length === 1 ? "sessão" : "sessões"}
							</div>
						</div>
					) : (
						<div className="flex flex-col items-center justify-center gap-4 pt-6 pb-8">
							<p className="text-muted-foreground text-center">
								Confirme sua presença no evento exibindo o QR
								Code para o moderador
							</p>
							<QRCodeSVG
								className="rounded-sm bg-white p-3"
								value={participantId}
								width={200}
								height={200}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function DecorativeDivider() {
	return (
		<div className="relative h-16 w-full md:h-auto md:w-16 md:flex-col">
			{/* Line decoration - vertical on mobile, horizontal on desktop */}
			<div className="border-foreground absolute top-1/2 left-1/2 h-px w-3/4 -translate-x-1/2 -translate-y-1/2 rounded border border-dashed opacity-30 md:h-3/4 md:w-px" />

			<div className="flex h-full flex-row md:flex-col">
				{/* Left/Top cutout */}
				<div className="relative aspect-square h-full md:h-auto md:w-full md:pb-[100%]">
					<svg
						className="text-card absolute inset-0 h-full w-full"
						viewBox="0 0 99 99"
						preserveAspectRatio="none"
					>
						<defs>
							<mask id="inverted-circle-mobile-1">
								<rect width="100" height="100" fill="white" />
								<circle cx="0" cy="50" r="50" fill="black" />
							</mask>
							<mask id="inverted-circle-desktop-1">
								<rect width="100" height="100" fill="white" />
								<circle cx="50" cy="0" r="50" fill="black" />
							</mask>
						</defs>
						<rect
							width="100"
							height="100"
							fill="currentColor"
							className="mask-[url(#inverted-circle-mobile-1)] md:mask-[url(#inverted-circle-desktop-1)]"
						/>
					</svg>
				</div>

				{/* Middle section */}
				<div className="bg-card h-full flex-1 md:aspect-square md:w-full" />

				{/* Right/Bottom cutout */}
				<div className="relative aspect-square h-full md:h-auto md:w-full md:pt-[100%]">
					<svg
						className="text-card absolute inset-0 h-full w-full"
						viewBox="0 0 99 99"
						preserveAspectRatio="none"
					>
						<defs>
							<mask id="inverted-circle-mobile-2">
								<rect width="100" height="100" fill="white" />
								<circle cx="100" cy="50" r="50" fill="black" />
							</mask>
							<mask id="inverted-circle-desktop-2">
								<rect width="100" height="100" fill="white" />
								<circle cx="50" cy="100" r="50" fill="black" />
							</mask>
						</defs>
						<rect
							width="100"
							height="100"
							fill="currentColor"
							className="mask-[url(#inverted-circle-mobile-2)] md:mask-[url(#inverted-circle-desktop-2)]"
						/>
					</svg>
				</div>
			</div>
		</div>
	);
}
