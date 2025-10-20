"use client";

import { useState } from "react";
import { Trash } from "lucide-react";
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

interface DeleteDialogProps {
	children: React.ReactNode;
	title: string;
	buttonText?: string;
	description: React.ReactNode;
	successTitle: string;
	successDescription?: React.ReactNode;
	onDelete: () => Promise<void>;
	onSuccessRedirect?: string;
}

export function DeleteDialog({
	children,
	title,
	buttonText,
	description,
	successTitle,
	successDescription,
	onDelete,
	onSuccessRedirect,
}: DeleteDialogProps) {
	const [currentState, setCurrentState] = useState<
		boolean | "submitting" | "submitted" | "error"
	>(false);

	async function handleDelete() {
		setCurrentState("submitting");
		try {
			await onDelete();
			setCurrentState("submitted");
		} catch (error) {
			console.error("Erro ao deletar:", error);
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
							{title || "Você tem certeza?"}
						</DialogTitle>
					</DialogHeader>
					<DialogDescription>{description}</DialogDescription>
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
							onClick={handleDelete}
						>
							{buttonText ?? "Excluir"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<LoadingDialog isOpen={currentState === "submitting"} />
			{successDescription ? (
				<SuccessDialog
					isOpen={currentState === "submitted"}
					title={successTitle}
					href={onSuccessRedirect}
					onClose={() => setCurrentState(false)}
					description={successDescription}
				/>
			) : null}
			<ErrorDialog
				isOpen={currentState === "error"}
				onClose={() => setCurrentState(false)}
				title="Erro ao excluir"
				description={
					<>
						Algo deu errado ao tentar excluir. <br /> Por favor,
						tente novamente. Caso o problema persista, entre em
						contato com o suporte.
					</>
				}
			/>
		</>
	);
}

import { trpc } from "@/lib/trpc/react";

interface ActivityDeleteDialogProps {
	children: React.ReactNode;
	activityId: string;
}

export function ActivityDeleteDialog({
	children,
	activityId,
}: ActivityDeleteDialogProps) {
	const mutation = trpc.deleteActivity.useMutation();

	return (
		<DeleteDialog
			children={children}
			title="Você tem certeza que deseja excluir esta atividade?"
			description={
				<>
					A exclusão da atividade removerá todas as informações
					anexadas e reduzirá a quantidade de horas obtida pelos
					particiantes. <br />
					Cuidado, pois essa ação não poderá ser desfeita.
				</>
			}
			successTitle="Atividade excluída com sucesso!"
			successDescription={
				<>
					A atividade foi removida com sucesso! <br />
					Ela não estará mais listada na página de atividades nem
					visível para os participantes
				</>
			}
			onDelete={async () => {
				await mutation.mutateAsync({ activityId });
			}}
			onSuccessRedirect="/dashboard/activities"
		/>
	);
}

interface SpeakerDeleteDialogProps {
	children: React.ReactNode;
	speakerId: number;
	onSuccess: () => void;
}

export function SpeakerDeleteDialog({
	children,
	speakerId,
	onSuccess,
}: SpeakerDeleteDialogProps) {
	const mutation = trpc.deleteSpeaker.useMutation();

	return (
		<DeleteDialog
			children={children}
			title="Você tem certeza que deseja excluir este palestrante?"
			description={
				<>
					A exclusão do palestrante removerá esse palestrante de TODAS
					as atividades às quais ele esteja vinculado. <br />
					Cuidado, pois essa ação não poderá ser desfeita.
				</>
			}
			successTitle="Palestrante excluído com sucesso!"
			onDelete={async () => {
				await mutation.mutateAsync({ id: speakerId });
				onSuccess();
			}}
		/>
	);
}
