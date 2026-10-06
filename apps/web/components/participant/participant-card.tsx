import { Suspense } from "react";

// Utils
import { getInitials, pluralize } from "@/lib/i18n";

// Icons
import { CircleMinus, Hash, Hourglass, LogOut, Mail } from "lucide-react";

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
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { LogoutForm } from "@/components/ui/logout-form";

// API
import { serverClient } from "@/lib/trpc/server";
import { RemoveParticipantDialog } from "../dialogs/remove-participant";

interface Props {
	id: string;
	eventUrl?: string;
}

export async function ParticipantCard({ id: participantId, eventUrl }: Props) {
	const {
		participant,
		isModerator,
		isModeratorParticipant,
		hours,
		totalEventsAttended,
	} = await serverClient.getParticipant({
		participantId,
	});

	let answers: Array<{ label: string; display: string }> = [];
	try {
		const result = await serverClient.getParticipantAnswers({
			participantId,
		});
		answers = result.answers.map((a) => {
			const label =
				(a.field?.label as string | undefined) ??
				(a.fieldSnapshot as { label?: string } | null)?.label ??
				"Resposta";
			const raw =
				(a as { value?: unknown }).value ??
				a.valueText ??
				a.valueNumber ??
				a.valueDate ??
				a.valueJson;
			let display = "";
			if (Array.isArray(raw)) display = raw.join("; ");
			else if (raw instanceof Date)
				display = raw.toISOString().slice(0, 10);
			else if (typeof raw === "boolean") display = raw ? "Sim" : "Não";
			else if (raw !== null && raw !== undefined) display = String(raw);
			return { label, display };
		});
	} catch {
		answers = [];
	}

	const projectUrl = eventUrl ?? participant.project.url;

	return (
		<Suspense fallback={<ParticipantCardSkeleton />}>
			<DialogHeader className="flex flex-col items-center justify-start gap-6">
				<Avatar className="h-32 w-32 rounded-2xl">
					<AvatarImage src={participant.user.image_url || ""} />
					<AvatarFallback>
						{getInitials(participant.user.name)}
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
					<Badge variant={"secondary"}>
						<Mail />
						{participant.user.email}
					</Badge>
					<Badge variant={"secondary"}>
						<Hash />
						{totalEventsAttended}{" "}
						{pluralize(
							totalEventsAttended,
							"atividades",
							"atividades",
						)}
					</Badge>
					<Badge variant={"secondary"}>
						<Hourglass />
						{hours} horas
					</Badge>
				</ul>
				{answers.length > 0 && (
					<div className="flex w-full flex-col gap-2 rounded-lg border p-4 text-left">
						<h4 className="text-sm font-bold">
							Respostas do formulário
						</h4>
						<ul className="flex flex-col gap-2">
							{answers.map((a, i) => (
								<li key={i} className="text-sm">
									<span className="font-semibold">
										{a.label}:{" "}
									</span>
									<span className="text-muted-foreground break-words">
										{a.display || "—"}
									</span>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
			<DialogFooter>
				{isModerator && !isModeratorParticipant ? (
					<RemoveParticipantDialog
						participantId={participant.id}
						projectUrl={projectUrl}
						userEmail={participant.user.email}
					>
						<Button className="w-full" variant={"destructive"}>
							<CircleMinus width={24} height={24} />
							Expulsar do evento
						</Button>
					</RemoveParticipantDialog>
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
