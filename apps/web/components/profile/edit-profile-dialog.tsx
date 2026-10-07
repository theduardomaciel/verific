"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SettingsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { EditMyAnswersForm } from "@/components/forms/dynamic/EditAnswersForm";
import { revalidateProfile } from "@/lib/profile-actions";

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

	async function handleOpenChange(next: boolean) {
		setOpen(next);
		if (!next) {
			await revalidateProfile(eventUrl, shortId);
			router.refresh();
		}
	}

	return (
		<Dialog open={open} onOpenChange={(v) => void handleOpenChange(v)}>
			<DialogTrigger asChild>
				<Button size="lg" className="ev-button rounded-full">
					<SettingsIcon />
					Editar perfil
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
				<DialogHeader>
					<DialogTitle>Editar perfil</DialogTitle>
				</DialogHeader>
				<EditMyAnswersForm
					projectId={projectId}
					projectUrl={eventUrl}
				/>
			</DialogContent>
		</Dialog>
	);
}
