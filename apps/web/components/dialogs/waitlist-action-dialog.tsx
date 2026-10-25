"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

import { revalidateParticipantActivities } from "@/app/actions";
import { trpc } from "@/lib/trpc/react";

interface PromoteFromWaitlistDialogProps {
	children: React.ReactNode;
	activityId: string;
	participantId: string;
	participantName: string;
}

export function PromoteFromWaitlistDialog({
	children,
	activityId,
	participantId,
	participantName,
}: PromoteFromWaitlistDialogProps) {
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const userRouter = useRouter();
	const utils = trpc.useUtils();
	const { projectId } = useDashboard();

	const promoteMutation = trpc.promoteFromWaitlist.useMutation();

	const isPending = promoteMutation.isPending;

	const handlePromote = async () => {
		try {
			await promoteMutation.mutateAsync({
				activityId,
				participantIds: [participantId],
			});

			// Optimistic update: remove from waitlist entries immediately
			utils.getActivityWaitlist.setQueriesData(
				{ activityId },
				{},
				(previous) => {
					if (!previous) return previous;
					const entries = previous.entries.filter(
						(entry) => entry.participantId !== participantId,
					);
					if (entries.length === previous.entries.length) {
						return previous;
					}
					const promoted = previous.entries.find(
						(entry) => entry.participantId === participantId,
					);
					return {
						...previous,
						entries,
						enrolled: previous.enrolled + 1,
						freeSeats:
							previous.freeSeats != null
								? Math.max(0, previous.freeSeats - 1)
								: null,
					};
				},
			);

			void utils.getActivityWaitlist.invalidate({ activityId });
			await revalidateParticipantActivities(participantId);
			toast.success(`${participantName} promovido da fila de espera`);
			setOpen(false);
			userRouter.refresh();
		} catch {
			toast.error("Erro ao promover participante");
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next && isPending) return;
				setOpen(next);
				if (!next) setReason("");
			}}
		>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Promover da fila de espera</DialogTitle>
					<DialogDescription className="flex flex-col gap-4">
						Tem certeza que deseja promover{" "}
						<strong>{participantName}</strong> da fila de espera? A
						vaga será confirmada imediatamente e o participante será
						notificado por e-mail.
					</DialogDescription>
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
					<Button
						variant="default"
						onClick={() => void handlePromote()}
						disabled={isPending}
					>
						{isPending ? "Promovendo..." : "Sim, promover"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface RemoveOfferDialogProps {
	children: React.ReactNode;
	activityId: string;
	participantId: string;
	participantName: string;
}

export function RemoveOfferDialog({
	children,
	activityId,
	participantId,
	participantName,
}: RemoveOfferDialogProps) {
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const userRouter = useRouter();
	const utils = trpc.useUtils();
	const { projectId } = useDashboard();

	const removeMutation = trpc.removeFromWaitlist.useMutation();

	const isPending = removeMutation.isPending;

	const handleRemoveOffer = async () => {
		try {
			await removeMutation.mutateAsync({
				activityId,
				participantId,
			});

			// Optimistic update: remove the offered entry
			utils.getActivityWaitlist.setQueriesData(
				{ activityId },
				{},
				(previous) => {
					if (!previous) return previous;
					const entries = previous.entries.filter(
						(entry) => entry.participantId !== participantId,
					);
					if (entries.length === previous.entries.length) {
						return previous;
					}
					return {
						...previous,
						entries,
					};
				},
			);

			void utils.getActivityWaitlist.invalidate({ activityId });
			await revalidateParticipantActivities(participantId);
			toast.success(`Oferta de ${participantName} removida`);
			setOpen(false);
			userRouter.refresh();
		} catch {
			toast.error("Erro ao remover oferta");
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next && isPending) return;
				setOpen(next);
				if (!next) setReason("");
			}}
		>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Remover oferta</DialogTitle>
					<DialogDescription className="flex flex-col gap-4">
						Tem certeza que deseja remover a oferta de{" "}
						<strong>{participantName}</strong>? A vaga será
						oferecida para o próximo participante na fila.
					</DialogDescription>
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
					<Button
						variant="destructive"
						onClick={() => void handleRemoveOffer()}
						disabled={isPending}
					>
						{isPending ? "Removendo..." : "Sim, remover oferta"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface RemoveFromWaitlistDialogProps {
	children: React.ReactNode;
	activityId: string;
	participantId: string;
	participantName: string;
}

export function RemoveFromWaitlistDialog({
	children,
	activityId,
	participantId,
	participantName,
}: RemoveFromWaitlistDialogProps) {
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const userRouter = useRouter();
	const utils = trpc.useUtils();
	const { projectId } = useDashboard();

	const removeMutation = trpc.removeFromWaitlist.useMutation();

	const isPending = removeMutation.isPending;

	const handleRemove = async () => {
		try {
			await removeMutation.mutateAsync({
				activityId,
				participantId,
			});

			// Optimistic update: remove from waitlist entries
			utils.getActivityWaitlist.setQueriesData(
				{ activityId },
				{},
				(previous) => {
					if (!previous) return previous;
					const entries = previous.entries.filter(
						(entry) => entry.participantId !== participantId,
					);
					if (entries.length === previous.entries.length) {
						return previous;
					}
					return {
						...previous,
						entries,
					};
				},
			);

			void utils.getActivityWaitlist.invalidate({ activityId });
			await revalidateParticipantActivities(participantId);
			toast.success(`${participantName} removido da fila de espera`);
			setOpen(false);
			userRouter.refresh();
		} catch {
			toast.error("Erro ao remover da fila de espera");
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next && isPending) return;
				setOpen(next);
				if (!next) setReason("");
			}}
		>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Remover da fila de espera</DialogTitle>
					<DialogDescription className="flex flex-col gap-4">
						Tem certeza que deseja remover{" "}
						<strong>{participantName}</strong> da fila de espera?
						Esta ação não pode ser desfeita e o participante será
						notificado por e-mail.
					</DialogDescription>
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
					<Button
						variant="destructive"
						onClick={() => void handleRemove()}
						disabled={isPending}
					>
						{isPending ? "Removendo..." : "Sim, remover da fila"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
