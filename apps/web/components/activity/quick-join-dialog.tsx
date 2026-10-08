"use client";

import { useEffect, useRef } from "react";

// Icons
import { Calendar, CircleAlert, Loader2 } from "lucide-react";

// Types
import type { RouterOutput } from "@verific/api";

// Components
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// Hooks
import { useJoinActivity, type JoinError } from "@/hooks/use-join-activity";
// Lib
import {
	getSessionsDateString,
	getSessionsSorted,
	getSessionTimeString,
} from "@/lib/date";

export type QuickJoinActivity =
	RouterOutput["getActivities"]["activities"][number];

export type JoinBlockReason = Exclude<JoinError, "unknown">;

interface QuickJoinDialogProps {
	activity: QuickJoinActivity | null;
	participantId: string;
	userId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onJoined: (activity: QuickJoinActivity) => void;
	onBlocked: (activity: QuickJoinActivity, reason: JoinBlockReason) => void;
}

/**
 * Confirmação de inscrição rápida: uma instância por programação (o dono
 * `ScheduleContent` injeta a atividade selecionada). Erro desconhecido
 * fica inline com retry; `full`/`closed`/`form-required` sobem para o
 * dono via `onBlocked`.
 */
export function QuickJoinDialog({
	activity,
	participantId,
	userId,
	open,
	onOpenChange,
	onJoined,
	onBlocked,
}: QuickJoinDialogProps) {
	const cancelRef = useRef<HTMLButtonElement>(null);
	const { join, status, reset } = useJoinActivity({
		activityId: activity?.id ?? "",
		participantId,
		userId,
	});
	const pending = status === "pending";

	useEffect(() => {
		if (open) reset();
	}, [open, activity?.id, reset]);

	async function handleConfirm(): Promise<void> {
		if (!activity || pending) return;
		const joinError = await join();
		if (!joinError) {
			onJoined(activity);
		} else if (joinError !== "unknown") {
			onBlocked(activity, joinError);
		}
	}

	function handleOpenChange(next: boolean): void {
		if (!next && pending) return;
		onOpenChange(next);
	}

	return (
		<AlertDialog open={open} onOpenChange={handleOpenChange}>
			{activity ? (
				<AlertDialogContent
					className="sm:max-w-[420px]"
					onOpenAutoFocus={(event) => {
						event.preventDefault();
						cancelRef.current?.focus();
					}}
					onEscapeKeyDown={(event) => {
						if (pending) event.preventDefault();
					}}
				>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Confirmar inscrição?
						</AlertDialogTitle>
						<AlertDialogDescription>
							Confirme sua inscrição em{" "}
							<span className="text-foreground font-semibold">
								{activity.name}
							</span>
							.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<ul className="flex flex-col gap-2">
						{getSessionsSorted(activity.sessions).map(
							(session, index) => (
								<li
									key={`session-${index}`}
									className="flex items-center gap-2 text-sm"
								>
									<Calendar className="text-muted-foreground h-4 w-4 shrink-0" />
									<span>
										{getSessionsDateString([session])} (
										{new Date(
											session.startsAt,
										).toLocaleDateString("pt-BR", {
											weekday: "long",
										})}
										) · {getSessionTimeString(session)}
									</span>
								</li>
							),
						)}
					</ul>
					{getSessionsSorted(activity.sessions).length > 1 ? (
						<p className="text-muted-foreground text-sm">
							Esta inscrição vale para todas as sessões.
						</p>
					) : null}

					{status === "error" ? (
						<Alert variant="destructive">
							<CircleAlert className="h-4 w-4" />
							<AlertTitle>Não foi possível concluir</AlertTitle>
							<AlertDescription>
								Não foi possível concluir a inscrição. Tente
								novamente.
							</AlertDescription>
						</Alert>
					) : null}

					<AlertDialogFooter>
						<AlertDialogCancel asChild>
							<Button
								ref={cancelRef}
								type="button"
								variant="outline"
								disabled={pending}
								className="min-h-11 w-full sm:w-auto"
							>
								Cancelar
							</Button>
						</AlertDialogCancel>
						<Button
							type="button"
							disabled={pending}
							aria-busy={pending}
							onClick={() => void handleConfirm()}
							className="min-h-11 w-full sm:w-auto"
						>
							{pending ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Inscrevendo...
								</>
							) : (
								"Confirmar inscrição"
							)}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			) : null}
		</AlertDialog>
	);
}
