// GAMBIARRA
"use client";

import { LogOutIcon } from "lucide-react";

import {
	revalidateParticipantActivities,
	revalidateSubscribedActivitiesIdsFromParticipant,
} from "@/app/actions";
import { trpc } from "@/lib/trpc/react";

import { DeleteDialog } from "../dialogs/delete-dialog";
import { Button } from "../ui/button";

interface Props {
	activityId: string;
	userId: string;
	participantId: string;
	projectUrl: string;
}

export function ParticipantQuitButton({
	activityId,
	userId,
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
		await revalidateSubscribedActivitiesIdsFromParticipant(userId);
		await revalidateParticipantActivities(userId);
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
			buttonText="Cancelar inscrição"
			successTitle="Inscrição cancelada com sucesso!"
			successDescription="Você saiu da atividade. Esperamos te ver em outras!"
			onSuccessRedirect={`/${projectUrl}`}
			onDelete={handleQuit}
		>
			<Button variant={"ghost"}>
				<LogOutIcon />
				Cancelar inscrição
			</Button>
		</DeleteDialog>
	);
}
