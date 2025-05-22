"use client";

import { useState } from "react";

// Icons
import { Trash } from "lucide-react";

// Components
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
import {
	ErrorDialog,
	LoadingDialog,
	SuccessDialog,
} from "@/components/forms/dialogs";

// API
import { trpc } from "@/lib/trpc/react";

interface Props {
	children: React.ReactNode;
	activityId: string;
	projectId: string;
}

export function EventDeleteDialog({ children, activityId, projectId }: Props) {
	const [currentState, setCurrentState] = useState<
		boolean | "submitting" | "submitted" | "error"
	>(false);

	const mutation = trpc.deleteActivity.useMutation();

	async function deleteEvent() {
		setCurrentState("submitting");
		try {
			await mutation.mutateAsync({ activityId });
			setCurrentState("submitted");
		} catch (error) {
			setCurrentState("error");
		}
	}

	return (
		<>
			<Dialog open={currentState === true} onOpenChange={setCurrentState}>
				<DialogTrigger asChild>{children}</DialogTrigger>
				<DialogContent className="flex flex-col items-center justify-center">
					<DialogHeader
						className="flex flex-col items-center justify-center gap-4"
						hasCloseButton={false}
					>
						<Trash width={56} height={56} />
						<DialogTitle className="font-dashboard px-8 text-center text-2xl font-extrabold">
							Você tem certeza que deseja excluir essa atividade?
						</DialogTitle>
					</DialogHeader>
					<DialogDescription>
						A exclusão da atividade removerá todas as informações
						anexadas e reduzirá a quantidade de horas obtida pelos
						participantes. <br /> Cuidado, pois essa ação não poderá
						ser desfeita.
					</DialogDescription>
					<DialogFooter className="w-full gap-2">
						<DialogClose asChild>
							<Button
								type="button"
								variant={"secondary"}
								className="flex-1 px-6"
							>
								Cancelar
							</Button>
						</DialogClose>
						<Button
							type="button"
							variant={"destructive"}
							className="flex-1"
							onClick={deleteEvent}
						>
							Excluir
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<LoadingDialog isOpen={currentState === "submitting"} />
			<SuccessDialog
				isOpen={currentState === "submitted"}
				title="Atividade excluída com sucesso!"
				href={`/dashboard/${projectId}/activities`}
				description={
					<>
						A atividade foi removida com sucesso! <br />
						Você será redirecionado para a página inicial.
					</>
				}
			/>
			<ErrorDialog
				isOpen={currentState === "error"}
				title="Erro ao excluir atividade"
				description={
					<>
						Algo deu errado ao tentar excluir a atividade.
						<br /> Por favor, tente novamente. Caso o problema
						persista, entre em contato com o suporte.
					</>
				}
			/>
		</>
	);
}
