"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Ban } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

import { useDashboard } from "@/components/dashboard/dashboard-context";

import {
	revalidateParticipantActivities,
	revalidateParticipantEnrollment,
	revalidateParticipants,
} from "@/app/actions";
import { trpc } from "@/lib/trpc/react";

interface RemoveParticipantDialogProps {
	children: React.ReactNode;
	participantId: string;
	activityId?: string;
	projectUrl: string;
	userEmail: string;
}

export function RemoveParticipantDialog({
	children,
	participantId,
	activityId,
	projectUrl,
	userEmail,
}: RemoveParticipantDialogProps) {
	const [open, setOpen] = useState(false);
	const userRouter = useRouter();
	const utils = trpc.useUtils();
	const { projectId } = useDashboard();

	const removeFromActivityMutation =
		trpc.deleteParticipantFromActivity.useMutation();
	const removeFromProjectMutation = trpc.removeParticipant.useMutation();

	const handleRemoveFromActivity = async () => {
		if (!activityId) return;
		try {
			await removeFromActivityMutation.mutateAsync({
				projectUrl,
				activityId,
				participantId,
			});
			await revalidateParticipantActivities(participantId);
			toast.success("Participante removido da atividade");
			setOpen(false);
			userRouter.refresh();
		} catch {
			toast.error("Erro ao remover participante da atividade");
		}
	};

	const handleRemoveFromProject = async () => {
		try {
			await removeFromProjectMutation.mutateAsync({
				participantId,
			});
			// Expulsar do evento some com a linha da lista de participantes
			// (todas as páginas/filtros já em cache) antes do `back()` — a
			// lista remontada não mostra mais o participante removido.
			utils.getParticipants.setQueriesData(
				{ projectId },
				{},
				(previous) => {
					if (
						!previous ||
						!previous.participants.some(
							(participant) => participant.id === participantId,
						)
					) {
						return previous;
					}
					return {
						...previous,
						participants: previous.participants.filter(
							(participant) => participant.id !== participantId,
						),
						amount: Math.max(0, previous.amount - 1),
					};
				},
			);
			void utils.getParticipants.invalidate();
			await revalidateParticipants();
			await revalidateParticipantEnrollment(participantId);
			toast.success("Participante removido do evento");
			setOpen(false);
			userRouter.back();
		} catch {
			toast.error("Erro ao remover participante do evento");
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<Ban className="h-8 w-8" />
					<DialogTitle>Remover Participante</DialogTitle>
					<DialogDescription className="flex flex-col gap-4">
						Ao remover este participante, ele perderá acesso ao{" "}
						{activityId ? "conteúdo da atividade" : "evento"} e não
						será notificado. <br /> Considere enviar um e-mail para
						o participante antes de prosseguir.
					</DialogDescription>
					<div className="flex flex-col items-start justify-center gap-4">
						<strong className="text-sm font-semibold">
							E-mail do participante:
						</strong>
						<code className="bg-muted w-full rounded p-2 text-center">
							&nbsp;{userEmail}
						</code>
						<p className="text-muted-foreground text-sm">
							Tem certeza de que deseja continuar?
						</p>
					</div>
				</DialogHeader>
				<DialogFooter className="flex gap-2">
					<DialogClose asChild>
						<Button
							disabled={removeFromProjectMutation.isPending}
							variant="outline"
						>
							Cancelar
						</Button>
					</DialogClose>
					{activityId ? (
						<Button
							variant="destructive"
							onClick={() => void handleRemoveFromActivity()}
							disabled={removeFromActivityMutation.isPending}
						>
							{removeFromActivityMutation.isPending
								? "Removendo..."
								: "Sim, remover"}
						</Button>
					) : (
						<Button
							variant="destructive"
							onClick={() => void handleRemoveFromProject()}
							disabled={removeFromProjectMutation.isPending}
						>
							{removeFromProjectMutation.isPending
								? "Removendo..."
								: "Sim, expulsar do evento"}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
