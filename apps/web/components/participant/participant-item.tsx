import Link from "next/link";

import { cn } from "@/lib/utils";

// Icons
import {
	Check,
	BookUser,
	Ban,
	Calendar,
	User,
	X,
	CircleMinus,
} from "lucide-react";

// Components
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";

// API
import type { RouterOutput } from "@verific/api";

// Utils
import { getTimeString } from "@/lib/date";
import { RemoveParticipantDialog } from "../dialogs/remove-participant";

type ActivityParticipant =
	RouterOutput["getActivity"]["activity"]["participants"][number];
type GeneralParticipant =
	RouterOutput["getParticipants"]["participants"][number];

interface BaseProps {
	className?: string;
	showJoinedAt?: boolean;
	url: string;
}

interface ActivityParticipantCardProps extends BaseProps {
	participant: ActivityParticipant;
	sessions?: RouterOutput["getActivity"]["activity"]["sessions"];
}

interface GeneralParticipantCardProps extends BaseProps {
	participant: GeneralParticipant;
}

function ParticipantAvatarAndInfo({
	participant,
}: {
	participant: ActivityParticipant | GeneralParticipant;
}) {
	return (
		<div className="flex flex-row items-center justify-start gap-4">
			<Avatar className="h-10.5 w-10.5">
				<AvatarImage
					className="aspect-square object-cover"
					src={participant.user?.image_url || undefined}
					alt="Participant image"
				/>
				<AvatarFallback>
					<User className="h-4 w-4" />
				</AvatarFallback>
			</Avatar>
			<div className="flex flex-col items-start justify-start">
				<h3 className="text-left text-base font-bold">
					{participant.user?.name}
				</h3>
				<p className="text-foreground text-xs font-semibold opacity-50">
					{participant.user?.email}
				</p>
			</div>
		</div>
	);
}

export const ParticipantListItem = {
	Activity({
		className,
		participant,
		sessions,
		url,
	}: ActivityParticipantCardProps) {
		const attendances = participant.sessionAttendances ?? [];
		const attendedSessionIds = new Set(attendances.map((a) => a.sessionId));
		const attendedCount = sessions
			? sessions.filter((s) => attendedSessionIds.has(s.id)).length
			: attendances.length;

		return (
			<>
				<li
					className={cn(
						"bg-card flex w-full flex-col items-start justify-start gap-4 rounded-lg border px-6 py-4",
						className,
						{
							"border-destructive/50":
								participant.role === "participant" &&
								attendedCount === 0,
						},
					)}
				>
					<ParticipantAvatarAndInfo participant={participant} />
					<div className="flex w-full flex-row items-center justify-between gap-4">
						<div className="text-foreground flex flex-col items-start justify-start gap-2">
							{participant.role === "participant" ? (
								<>
									<p className="text-left text-sm leading-tight font-medium">
										{attendedCount > 0 ? (
											<>
												Presente em {attendedCount} de{" "}
												{sessions?.length ?? 0}{" "}
												{sessions?.length === 1
													? "sessão"
													: "sessões"}
											</>
										) : (
											"Ainda não marcou presença"
										)}
									</p>
									{sessions && sessions.length > 0 ? (
										<div className="flex flex-wrap gap-1.5">
											{sessions.map((session, i) => {
												const attended =
													attendedSessionIds.has(
														session.id,
													);
												return (
													<span
														key={session.id}
														className={cn(
															"flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
															attended
																? "border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-500"
																: "text-muted-foreground",
														)}
													>
														{attended ? (
															<Check className="h-3 w-3" />
														) : (
															<X className="h-3 w-3" />
														)}
														S{i + 1} ·{" "}
														{getTimeString(
															session.startsAt,
															true,
														)}
													</span>
												);
											})}
										</div>
									) : null}
								</>
							) : (
								<div className="flex flex-row items-center justify-start gap-2">
									<User className="h-4 w-4" />

									<p className="text-left text-sm leading-tight font-bold">
										Monitor
									</p>
								</div>
							)}
						</div>
						<RemoveParticipantDialog
							participantId={participant.id}
							activityId={participant.activityId}
							projectUrl={url}
							userEmail={participant.user.email}
						>
							<Button variant={"ghost"} size={"icon"}>
								{participant.role === "participant" ? (
									<Ban className="text-foreground h-4 w-4" />
								) : (
									<CircleMinus className="text-foreground h-4 w-4" />
								)}
							</Button>
						</RemoveParticipantDialog>
					</div>
				</li>
			</>
		);
	},
	General({ className, participant, url }: GeneralParticipantCardProps) {
		return (
			<>
				<li
					className={cn(
						"bg-card flex w-full flex-col items-start justify-start gap-4 rounded-lg border px-6 py-4 md:gap-2",
						className,
					)}
				>
					<ParticipantAvatarAndInfo participant={participant} />
					<div className="flex w-full flex-row flex-wrap items-center justify-between gap-4">
						<div className="flex flex-row items-center justify-start gap-3 text-left text-sm leading-tight font-medium">
							<div className="flex flex-row items-center justify-start gap-2">
								<Calendar className="h-4 w-4" />
								Inscreveu-se em{" "}
								{new Date(
									participant.joinedAt,
								).toLocaleDateString("pt-BR", {
									day: "2-digit",
									month: "2-digit",
									year: "2-digit",
								})}
							</div>
						</div>
						<Button
							className="hidden p-0 md:flex"
							variant={"ghost"}
							size={"icon"}
							asChild
						>
							<Link href={`${url}/${participant.id}`}>
								<BookUser className="text-foreground h-4 w-4" />
								<span className="sr-only">Ver detalhes</span>
							</Link>
						</Button>
						<Button
							className="flex w-full md:hidden"
							variant={"default"}
							asChild
						>
							<Link href={`${url}/${participant.id}`}>
								<BookUser className="text-foreground h-4 w-4" />
								<span>Ver detalhes</span>
							</Link>
						</Button>
					</div>
				</li>
			</>
		);
	},
};
