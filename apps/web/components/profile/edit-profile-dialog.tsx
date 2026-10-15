"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SettingsIcon, LogOut } from "lucide-react";
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

import { EditMyAnswersForm } from "@/components/forms/dynamic/EditAnswersForm";

import { revalidateParticipants } from "@/app/actions";
import { revalidateProfile } from "@/lib/profile-actions";
import { trpc } from "@/lib/trpc/react";

interface EditProfileDialogProps {
	eventUrl: string;
	projectId: string;
	shortId: string;
}

/**
 * Diálogo "Editar perfil": respostas da inscrição (visibilidade por
 * campo mora junto de cada campo, no próprio formulário).
 */
export function EditProfileDialog({
	eventUrl,
	projectId,
	shortId,
}: EditProfileDialogProps) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [removeOpen, setRemoveOpen] = useState(false);

	const removeSelfMutation = trpc.removeSelfFromEvent.useMutation();

	async function handleOpenChange(next: boolean) {
		setOpen(next);
		if (!next) {
			await revalidateProfile(eventUrl, shortId);
			router.refresh();
		}
	}

	const handleRemoveSelf = async () => {
		try {
			await removeSelfMutation.mutateAsync({ projectId });
			await revalidateParticipants();
			// Note: we don't have direct access to userId here, but the enrollment
			// tag will be invalidated by the server action when the participant is removed
			toast.success("Você saiu do evento com sucesso");
			setRemoveOpen(false);
			// Redirect to the event public page after leaving
			router.push(`/${eventUrl}`);
		} catch (error) {
			console.error("Erro ao sair do evento:", error);
			toast.error("Erro ao sair do evento. Tente novamente.");
		}
	};

	return (
		<>
			<Dialog open={open} onOpenChange={(v) => void handleOpenChange(v)}>
				<DialogTrigger asChild>
					<Button size="lg" className="ev-button rounded-full">
						<SettingsIcon />
						Editar perfil
					</Button>
				</DialogTrigger>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-160">
					<DialogHeader>
						<DialogTitle>Editar perfil</DialogTitle>
					</DialogHeader>
					<EditMyAnswersForm
						projectId={projectId}
						projectUrl={eventUrl}
					/>
					<div className="mt-6 border-t pt-4">
						<Button
							variant="destructive"
							className="w-full"
							onClick={() => setRemoveOpen(true)}
							disabled={removeSelfMutation.isPending}
						>
							<LogOut className="mr-2 h-4 w-4" />
							Sair do evento
						</Button>
						<p className="text-muted-foreground mt-2 text-center text-xs">
							Esta ação é irreversível. Você perderá acesso ao
							evento e todas as suas inscrições em atividades
							serão canceladas.
						</p>
					</div>
				</DialogContent>
			</Dialog>

			{/* Confirmation dialog for removing self from event */}
			<Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
				<DialogContent className="sm:max-w-100">
					<DialogHeader>
						<LogOut className="text-destructive mx-auto mb-2 h-8 w-8" />
						<DialogTitle className="text-center">
							Sair do evento
						</DialogTitle>
						<DialogDescription className="text-center">
							Tem certeza de que deseja sair deste evento? Esta
							ação é irreversível e removerá sua inscrição,
							cancelando todas as suas participações em
							atividades.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex justify-center gap-2">
						<Button
							variant="outline"
							onClick={() => setRemoveOpen(false)}
							disabled={removeSelfMutation.isPending}
						>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							onClick={() => void handleRemoveSelf()}
							disabled={removeSelfMutation.isPending}
						>
							{removeSelfMutation.isPending
								? "Saindo..."
								: "Sim, sair do evento"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
