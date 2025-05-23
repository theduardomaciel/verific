import Image from "next/image";

import { cn } from "@/lib/utils";

// Icons
import { Check, BookUser, Ban, Calendar, User, X } from "lucide-react";
import { RouterOutput } from "@verific/api";

// API
type ActivityParticipant =
	RouterOutput["getActivity"]["activity"]["participants"][number];
type GeneralParticipant =
	RouterOutput["getParticipants"]["participants"][number];

interface BaseProps {
	className?: string;
	showJoinedAt?: boolean;
}

interface ActivityParticipantCardProps extends BaseProps {
	participant: ActivityParticipant;
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
			<Image
				src={
					participant.user?.image_url ??
					"https://i.imgur.com/5Hsj4tJ.jpeg"
				}
				width={42}
				height={42}
				alt="Participant profile picture"
				className="aspect-square rounded-full object-cover"
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
	);
}

function ParticipantActions() {
	return (
		<div className="flex flex-row items-center justify-end gap-2 md:gap-4">
			<button type="button" className="cursor-pointer">
				<BookUser className="text-foreground h-4 w-4" />
			</button>
			<button type="button" className="cursor-pointer">
				<Ban className="text-foreground h-4 w-4" />
			</button>
		</div>
	);
}

// Card para participantes de getActivity
export function ActivityParticipantCard({
	className,
	showJoinedAt = true,
	participant,
}: ActivityParticipantCardProps) {
	return (
		<li
			className={cn(
				"bg-card flex w-full flex-col items-start justify-start gap-4 rounded-lg border px-6 py-4",
				className,
				{
					"border-destructive":
						participant.role === "participant" &&
						!participant.joinedAt,
				},
			)}
		>
			<ParticipantAvatarAndInfo participant={participant} />
			<div className="flex w-full flex-row items-center justify-between gap-4">
				<div className="text-foreground flex flex-row items-center justify-start gap-4">
					{participant.role === "participant" &&
					participant.joinedAt != null ? (
						<>
							<Check className="h-4 w-4" />
							<p className="text-left text-sm leading-tight font-medium">
								Marcou presença às{" "}
								{participant.joinedAt.toLocaleTimeString(
									"pt-BR",
									{
										hour: "2-digit",
										minute: "2-digit",
									},
								)}
							</p>
						</>
					) : participant.role === "participant" ? (
						<>
							<X className="h-4 w-4" />
							<p className="text-left text-sm leading-tight font-medium">
								Ainda não marcou presença
							</p>
						</>
					) : null}
				</div>
				{participant.role === "participant" && <ParticipantActions />}
			</div>
		</li>
	);
}

export function GeneralParticipantCard({
	className,
	participant,
}: GeneralParticipantCardProps) {
	return (
		<li
			className={cn(
				"bg-card flex w-full flex-col items-start justify-start gap-4 rounded-lg border px-6 py-4",
				className,
			)}
		>
			<ParticipantAvatarAndInfo participant={participant} />
			<div className="flex w-full flex-row items-center justify-between gap-4">
				<div className="flex flex-row items-center justify-start gap-3 text-left text-sm leading-tight font-medium">
					<User className="h-4 w-4" />
					{participant.role === "moderator" ? "Moderador" : "Membro"}
					<div className="bg-foreground h-1 w-1 rounded-full" />
					<div className="flex flex-row items-center justify-start gap-2">
						<Calendar className="h-4 w-4" />
						Inscreveu-se em{" "}
						{participant.joinedAt!.toLocaleDateString("pt-BR", {
							day: "2-digit",
							month: "2-digit",
							year: "2-digit",
						})}
					</div>
				</div>
			</div>
		</li>
	);
}
