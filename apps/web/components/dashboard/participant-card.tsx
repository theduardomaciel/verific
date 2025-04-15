import Image from "next/image";

import { cn } from "@/lib/utils";

// Icons
import { Check, BookUser, Ban, Calendar, User } from "lucide-react";
import { Participant } from "@/lib/types/participant";

// API
interface Props {
	className?: string;
	participantCardHref: string;
	showJoinedAt?: boolean;
	activity?: {
		id: string;
		participantJoinedAt: Date;
	};
	participant: Participant;
}

export function ParticipantCard({
	className,
	activity,
	showJoinedAt = true,
	participant,
}: Props) {
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
				{activity ? (
					<div className="text-foreground flex flex-row items-center justify-start gap-4">
						{participant.role === "participant" && (
							<Check className="h-4 w-4" />
						)}
						{participant.role === "participant" && (
							<p className="text-left text-sm leading-tight font-medium">
								Marcou presença às{" "}
								{activity?.participantJoinedAt.toLocaleTimeString(
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
						<User className="h-4 w-4" />
						{participant.role === "moderator"
							? "Moderador"
							: "Membro"}
						{showJoinedAt && (
							<>
								<div className="bg-foreground h-1 w-1 rounded-full" />
								<div className="flex flex-row items-center justify-start gap-2">
									<Calendar className="h-4 w-4" />
									Entrou em{" "}
									{participant.joinedAt.toLocaleDateString(
										"pt-BR",
										{
											day: "2-digit",
											month: "2-digit",
											year: "2-digit",
										},
									)}
								</div>
							</>
						)}
					</div>
				)}
				{participant.role === "participant" && (
					<div className="flex flex-row items-center justify-end gap-2 md:gap-4">
						<button type="button" className="cursor-pointer">
							<BookUser className="text-foreground h-4 w-4" />
						</button>
						<button type="button" className="cursor-pointer">
							<Ban className="text-foreground h-4 w-4" />
						</button>
					</div>
				)}
			</div>
		</li>
	);
}
