import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";

// Utils
import { pluralize } from "@/lib/i18n";

// Icons
import { Hash, Hourglass, LogOut, Mail, Settings, User } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import {
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LogoutForm } from "@/components/ui/logout-form";

// API
import { serverClient } from "@/lib/trpc/server";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface Props {
	id: string;
	eventUrl?: string;
}

export async function ParticipantCard({ id: participantId, eventUrl }: Props) {
	const projectUrl =
		eventUrl ??
		(await (async () => {
			const cookieStore = await cookies();
			return cookieStore.get("projectUrl")?.value ?? "";
		})());

	const { participant, hours, totalEventsAttended, clientRole, isUser } =
		await serverClient.getParticipant({
			participantId,
		});

	return (
		<Suspense fallback={<ParticipantCardSkeleton />}>
			<DialogHeader className="flex flex-col items-center justify-start gap-6">
				<Avatar className="h-32 w-32 rounded-2xl">
					<AvatarImage src={participant.user.image_url || ""} />
					<AvatarFallback>
						{participant.user.name
							?.split(" ")
							.map((n) => n[0])
							.join("")
							.toUpperCase()}
					</AvatarFallback>
				</Avatar>
				<div className="flex flex-col items-center justify-start gap-1">
					<DialogTitle>{participant.user.name}</DialogTitle>
					<DialogDescription>
						#{participant.id.split("-")[0]}
					</DialogDescription>
				</div>
			</DialogHeader>
			<div className="flex flex-col items-center justify-center gap-6">
				<ul className="flex w-full flex-row flex-wrap items-center justify-center gap-2 md:max-w-[70%]">
					<Badge variant={"secondary"} size={"xl"}>
						<User />
						{participant.role === "participant"
							? "Participante"
							: "Moderador"}
					</Badge>
					<Badge variant={"secondary"} size={"xl"}>
						<Mail />
						{participant.user.email}
					</Badge>
					<Badge variant={"secondary"} size={"xl"}>
						<Hash />
						{totalEventsAttended}{" "}
						{participant.role === "participant"
							? pluralize(
									totalEventsAttended,
									"atividade presenciada",
									"atividades presenciadas",
								)
							: pluralize(
									totalEventsAttended,
									"atividade moderada",
									"atividades moderadas",
								)}
					</Badge>
					{participant.role === "participant" && (
						<Badge variant={"secondary"} size={"xl"}>
							<Hourglass />
							{hours} horas
						</Badge>
					)}
				</ul>
			</div>
			<DialogFooter>
				{isUser ? (
					clientRole === "moderator" ? (
						<Button className="w-full" asChild>
							<Link href={"/auth"} className="w-full">
								<Settings width={24} height={24} />
								Gerenciar minha conta
							</Link>
						</Button>
					) : (
						<LogoutForm
							className="w-full"
							redirectTo={`/${projectUrl}`}
						>
							<Button type="submit" className="w-full">
								<LogOut width={24} height={24} />
								Log-out
							</Button>
						</LogoutForm>
					)
				) : (
					clientRole === "moderator" && (
						<Button className="w-full" asChild>
							<Link href={"/auth"} className="w-full">
								<Settings width={24} height={24} />
								Expulsar participante
							</Link>
						</Button>
					)
				)}
			</DialogFooter>
		</Suspense>
	);
}

export function ParticipantCardSkeleton() {
	return (
		<>
			<div className="flex flex-col items-center justify-start gap-6">
				<Skeleton className="h-32 w-32 rounded-2xl" />
				<div className="flex flex-col items-center justify-start gap-1">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-2 w-16" />
				</div>
			</div>
			<div className="flex w-full flex-col items-center justify-center gap-6">
				<ul className="flex flex-col flex-wrap items-center justify-center gap-2 sm:max-w-[70%] sm:flex-row">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-32" />
				</ul>
				<ul className="flex w-full flex-col items-center justify-start gap-2">
					<Skeleton className="h-10 w-full" />
				</ul>
			</div>
			<div className="flex flex-col items-center justify-start gap-2">
				<Skeleton className="h-12 w-full" />
			</div>
		</>
	);
}
