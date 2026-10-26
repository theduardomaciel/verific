"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Ban } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { useDashboard } from "@/components/dashboard/dashboard-context";

import { refreshRoute } from "@/app/actions";
import { removeMatchingItems } from "@/lib/trpc/optimistic";
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
	const [reason, setReason] = useState("");
	const userRouter = useRouter();
	const utils = trpc.useUtils();
	const { projectId } = useDashboard();

	const removeFromActivityMutation =
		trpc.deleteParticipantFromActivity.useMutation();
	const removeFromProjectMutation = trpc.removeParticipant.useMutation();

	const isPending =
		removeFromActivityMutation.isPending ||
		removeFromProjectMutation.isPending;

	const handleRemoveFromActivity = async () => {
		if (!activityId) return;
		try {
			await removeFromActivityMutation.mutateAsync({
				projectUrl,
				activityId,
				participantId,
				reason: reason.trim() || undefined,
			});
			// Some com a linha da lista da atividade (todas as páginas já em
			// cache) antes do refetch disparado pelo `invalidate()`.
			utils.getActivity.setQueriesData({ activityId }, {}, (previous) => {
				if (
					!previous ||
					typeof previous.participantsAmount !== "number"
				) {
					return previous;
				}
				const participants = previous.activity.participants.filter(
					(participant) => participant.id !== participantId,
				);
				if (
					participants.length ===
					previous.activity.participants.length
				) {
					return previous;
				}
				return {
					...previous,
					activity: { ...previous.activity, participants },
					participantsAmount: Math.max(
						0,
						previous.participantsAmount - 1,
					),
				};
			});
			void utils.getActivity.invalidate();
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
				reason: reason.trim() || undefined,
			});
			// Expulsar do evento some com a linha da lista de participantes
			// (todas as páginas/filtros já em cache) antes do `back()`.
			utils.getParticipants.setQueriesData(
				{ projectId },
				{},
				(previous) =>
					previous
						? removeMatchingItems(
								previous,
								"participants",
								(participant) =>
									participant.id === participantId,
							)
						: previous,
			);
			void utils.getParticipants.invalidate();
			// Já removido: uma falha ao atualizar a tela não vira erro
			void refreshRoute().catch(console.error);
			toast.success("Participante removido do evento");
			setOpen(false);
			userRouter.back();
		} catch {
			toast.error("Erro ao remover participante do evento");
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				// Não fecha (Cancelar, ESC ou clique fora) durante a remoção.
				if (!next && isPending) return;
				setOpen(next);
				if (!next) setReason("");
			}}
		>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<Ban className="h-8 w-8" />
					<DialogTitle>Remover Participante</DialogTitle>
					<DialogDescription className="flex flex-col gap-4">
						Ao remover este participante, ele perderá acesso ao{" "}
						{activityId ? "conteúdo da atividade" : "evento"} e será
						notificado por e-mail, caso essa notificação esteja
						habilitada nas configurações do evento.
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
					<div className="flex flex-col gap-2">
						<label
							htmlFor="remove-participant-reason"
							className="text-sm font-semibold"
						>
							Motivo (opcional)
						</label>
						<Textarea
							id="remove-participant-reason"
							placeholder="Ex.: Conflito de horário com outra atividade."
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							maxLength={500}
							rows={3}
						/>
						<p className="text-muted-foreground text-right text-xs">
							{reason.length}/500
						</p>
					</div>
				</DialogHeader>
				<DialogFooter className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						disabled={isPending}
						onClick={() => {
							if (isPending) return;
							setReason("");
							setOpen(false);
						}}
					>
						Cancelar
					</Button>
					{activityId ? (
						<Button
							variant="destructive"
							onClick={() => void handleRemoveFromActivity()}
							disabled={isPending}
						>
							{removeFromActivityMutation.isPending
								? "Removendo..."
								: "Sim, remover"}
						</Button>
					) : (
						<Button
							variant="destructive"
							onClick={() => void handleRemoveFromProject()}
							disabled={isPending}
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
