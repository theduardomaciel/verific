"use client";

import { useState } from "react";
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
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import {
	revalidateParticipantActivities,
	revalidateParticipantEnrollment,
	revalidateParticipants,
} from "@/app/actions";

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
		} catch (error) {
			toast.error("Erro ao remover participante da atividade");
		}
	};

	const handleRemoveFromProject = async () => {
		try {
			await removeFromProjectMutation.mutateAsync({
				participantId,
			});
			await revalidateParticipants();
			await revalidateParticipantEnrollment(participantId);
			toast.success("Participante removido do evento");
			setOpen(false);
			userRouter.back();
		} catch (error) {
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
							onClick={handleRemoveFromActivity}
							disabled={removeFromActivityMutation.isPending}
						>
							{removeFromActivityMutation.isPending
								? "Removendo..."
								: "Sim, remover"}
						</Button>
					) : (
						<Button
							variant="destructive"
							onClick={handleRemoveFromProject}
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
