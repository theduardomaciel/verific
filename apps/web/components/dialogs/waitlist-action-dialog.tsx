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

import { revalidateParticipantActivities } from "@/app/actions";

interface WaitlistActionDialogProps {
	children: React.ReactNode;
	title: string;
	description: React.ReactNode;
	confirmLabel: string;
	pendingLabel: string;
	variant?: "default" | "destructive" | "outline";
	successMessage: string;
	errorMessage: string;
	participantId?: string;
	onConfirm: (reason: string | undefined) => Promise<void>;
	isPending: boolean;
}

export function WaitlistActionDialog({
	children,
	title,
	description,
	confirmLabel,
	pendingLabel,
	variant = "default",
	successMessage,
	errorMessage,
	participantId,
	onConfirm,
	isPending,
}: WaitlistActionDialogProps) {
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const userRouter = useRouter();

	const handleConfirm = async () => {
		try {
			await onConfirm(reason.trim() || undefined);
			if (participantId) {
				await revalidateParticipantActivities(participantId);
			}
			toast.success(successMessage);
			setOpen(false);
			setReason("");
			userRouter.refresh();
		} catch {
			toast.error(errorMessage);
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
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription className="flex flex-col gap-4">
						{description}
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-2">
					<label
						htmlFor="waitlist-action-reason"
						className="text-sm font-medium"
					>
						Motivo (opcional)
					</label>
					<Textarea
						id="waitlist-action-reason"
						value={reason}
						onChange={(event) => setReason(event.target.value)}
						placeholder="Descreva o motivo da ação..."
						disabled={isPending}
						rows={3}
					/>
				</div>
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
						variant={variant}
						onClick={() => void handleConfirm()}
						disabled={isPending}
					>
						{isPending ? pendingLabel : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
