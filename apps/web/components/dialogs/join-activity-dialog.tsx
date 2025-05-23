"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Loader2 } from "lucide-react";
// Components
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	ActivityCardSpeaker,
	ActivityCardTags,
} from "../landing/activity-card";

// API
import { RouterOutput } from "@verific/api";
import { trpc } from "@/lib/trpc/react";
import { FormState } from "@/lib/types/forms";
import { ErrorDialog, LoadingDialog, SuccessDialog } from "../forms/dialogs";

interface Props {
	participantId?: string | null;
	activity: RouterOutput["getActivity"]["activity"];
}

export function JoinActivityDialog({ participantId, activity }: Props) {
	const [currentState, setCurrentState] = useState<FormState>(false);
	const isLoading = currentState === "submitting";

	const router = useRouter();

	const addMutation = trpc.addActivityParticipants.useMutation();

	function onDismiss() {
		router.back();
	}

	async function onSubmit() {
		setCurrentState("submitting");

		if (!participantId) {
			setCurrentState("error");
			return;
		}

		try {
			await addMutation.mutateAsync({
				activityId: activity.id,
				participantsIdsToAdd: [participantId],
			});
			setCurrentState("submitted");
		} catch (error) {
			console.error(error);
			setCurrentState("error");
		}
	}

	return (
		<Dialog
			open={true}
			onOpenChange={(open) => !open && !isLoading && onDismiss()}
		>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader className="w-full items-center justify-center text-center">
					<Badge className="mb-2">{activity.category}</Badge>
					<DialogTitle className="w-full text-center">
						{activity.name}
					</DialogTitle>
					<DialogDescription className="w-full text-center">
						{activity.description}
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col">
					{activity.speaker ? (
						<ActivityCardSpeaker speaker={activity.speaker} />
					) : null}
					<ActivityCardTags activity={activity} />
					<span className="text-muted-foreground bg-muted/50 rounded-sm p-4 text-sm">
						Este evento possui <strong>fila de espera</strong>. Caso
						não haja confirmação de sua presença, sua vaga será
						cedida a outra pessoa.
					</span>
				</div>
				{/* <p className="text-foreground text-sm">
					Você está prestes a entrar na atividade{" "}
					<strong>{activity.name}</strong>. Você pode sair a qualquer
					momento.
				</p> */}
				{/* <span className="text-muted-foreground bg-muted/50 rounded-sm p-4 text-sm">
					Ao entrar, você concorda com os{" "}
					<a
						href="https://verific.com.br/termos-de-uso"
						target="_blank"
						rel="noreferrer"
						className="text-blue-500 underline"
					>
						termos de uso
					</a>{" "}
					e a{" "}
					<a
						href="https://verific.com.br/politica-de-privacidade"
						target="_blank"
						rel="noreferrer"
						className="text-blue-500 underline"
					>
						política de privacidade
					</a>{" "}
					do verifIC.
				</span> */}
				<DialogFooter className="w-full grid-cols-2 gap-3 md:grid">
					<DialogClose asChild>
						<Button
							disabled={isLoading}
							type="button"
							variant={"outline"}
						>
							Cancelar
						</Button>
					</DialogClose>
					<Button
						disabled={isLoading}
						type="button"
						onClick={onSubmit}
					>
						{isLoading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							"Inscrever-se"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
			<SuccessDialog
				isOpen={currentState === "submitted"}
				onClose={() => {
					setCurrentState(false);
					router.back();
				}}
				title="Inscrição realizada com sucesso!"
				description="Você se inscreveu na atividade com sucesso. Você pode sair a qualquer momento."
				buttonText="Fechar"
			/>
			<LoadingDialog
				isOpen={currentState === "submitting"}
				title="Inscrevendo-se na atividade..."
				description="Estamos processando sua inscrição. Isso pode levar alguns segundos."
			/>
			<ErrorDialog
				isOpen={currentState === "error"}
				onClose={() => setCurrentState(false)}
				title="Erro ao se inscrever"
				description="Houve um erro ao se inscrever na atividade. Tente novamente mais tarde."
			/>
		</Dialog>
	);
}
