// GAMBIARRA
"use client";

import { LogOutIcon } from "lucide-react";
import { DeleteDialog } from "../dialogs/delete-dialog";
import { Button } from "../ui/button";

import { trpc } from "@/lib/trpc/react";

interface Props {
	activityId: string;
	participantId: string;
	projectUrl: string;
}

export function ParticipantQuitButton({
	activityId,
	participantId,
	projectUrl,
}: Props) {
	const mutation = trpc.deleteParticipantFromActivity.useMutation();

	async function handleQuit() {
		await mutation.mutateAsync({
			activityId,
			participantId,
			projectUrl,
		});
	}

	return (
		<DeleteDialog
			title="Cancelar inscrição"
			description={
				<>
					Tem certeza que deseja sair desta atividade? Você perderá
					sua vaga e precisará se inscrever novamente.
				</>
			}
			successTitle="Inscrição cancelada com sucesso!"
			successDescription="Você saiu da atividade. Esperamos te ver em outras!"
			onSuccessRedirect={`/${projectUrl}/schedule`}
			onDelete={handleQuit}
		>
			<Button variant={"ghost"} size={"icon"}>
				<LogOutIcon />
			</Button>
		</DeleteDialog>
	);
}
