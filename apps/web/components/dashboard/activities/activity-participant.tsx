import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

// import { ParticipantPromote } from "./ParticipantPromote";
import { Skeleton } from "@/components/ui/skeleton";

// Icons
import { X, Check } from "lucide-react";
import { Participant } from "@/lib/types/participant";
import { ParticipantOnActivity } from "@/lib/types/participant-on-activity";

// API
interface Props {
	className?: string;
	participantCardHref: string;
	event?: {
		id: string;
		participantJoinedAt: Date;
	};
	participant: Participant & {
		role: ParticipantOnActivity["role"];
	};
}

export function ParticipantCard({ className, event, participant }: Props) {
	return (
		<li
			className={cn(
				"bg-card flex w-full flex-col items-start justify-start gap-4 rounded-lg border px-6 py-4",
				className,
			)}
		>
			<div className="flex flex-row items-center justify-start gap-4">
				<Image
					src={participant.user?.image_url ?? ""}
					width={42}
					height={42}
					alt="Participant profile picture"
					className="rounded-full"
				/>
				<div className="flex flex-col items-start justify-start">
					<h3 className="text-left text-base font-bold">
						{participant.user?.name}
					</h3>
					<p className="text-foreground text-xs font-semibold opacity-50">
						#{participant.id.split("-")[0]}
					</p>
				</div>
			</div>
			<div className="flex w-full flex-row items-center justify-between gap-4">
				{event ? (
					<div className="text-foreground flex flex-row items-center justify-start gap-4">
						{participant.role === "participant" && (
							<Check className="h-4 min-h-4 w-4 min-w-4 md:min-h-4 md:min-w-4" />
						)}
						{participant.role === "participant" && (
							<p className="text-left text-sm leading-tight font-medium">
								Marcou presença às{" "}
								{event?.participantJoinedAt.toLocaleTimeString(
									"pt-BR",
									{
										hour: "2-digit",
										minute: "2-digit",
									},
								)}
							</p>
						)}
					</div>
				) : (
					<div className="flex flex-row items-center justify-start gap-3 text-left text-sm leading-tight font-medium">
						{participant.role === "moderator"
							? "Moderador"
							: "Membro"}
						<div className="bg-neutral h-1 w-1 rounded-full" />
						<span className="lowercase">
							{participant.id.split("-")[0]}
						</span>
					</div>
				)}
				{/* <div className="flex flex-row items-center justify-end gap-2 md:gap-4">
					{participant.role === "participant" && (
						<ParticipantPromote
							participant={{
								id: participant.id,
								name: participant.user?.name ?? participant.username,
								role: participant.role,
							}}
						/>
					)}
				</div> */}
			</div>
		</li>
	);
}

interface GuestProps {
	className?: Props["className"];
	participant: Props["participant"];
	periodSlug?: string;
	isParticipant?: boolean | null;
}

export function ParticipantGuestPreview({
	className,
	participant,
	periodSlug,
}: GuestProps) {
	return (
		<li
			className={cn(
				"border-primary-200/50 w-full content-stretch items-center justify-between rounded-lg border bg-gray-300 px-8 py-4 transition-colors hover:bg-gray-200",
				className,
			)}
		>
			<div className="flex flex-row items-center justify-start gap-4">
				<Image
					src={participant.user?.image_url ?? ""}
					width={42}
					height={42}
					alt="Participant profile picture"
					className="rounded-full"
				/>
				<div className="flex flex-col items-start justify-start">
					<div className="flex flex-row items-center justify-start gap-0 md:gap-2">
						<h3 className="text-left text-base font-bold">
							{participant.user?.name}
						</h3>
					</div>
					{periodSlug ? (
						<div className="flex flex-row items-center justify-start gap-2">
							<X className="h-4 w-4" />
							<p className="text-sm md:text-base">
								{participant.role === "moderator"
									? "Moderador"
									: "Membro"}{" "}
								desde {periodSlug}
							</p>
						</div>
					) : (
						<Skeleton className="h-4 w-28" />
					)}
				</div>
			</div>
		</li>
	);
}
