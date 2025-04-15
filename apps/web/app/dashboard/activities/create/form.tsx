"use client";

import { useRef, useState } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Components
import { Form } from "@/components/ui/form";
import {
	ErrorDialog,
	LoadingDialog,
	SuccessDialog,
} from "@/components/forms/dialogs";

// Content
import { MutateActivityFormContent } from "@/components/dashboard/activity/create/form";

// Validation
import {
	type MutateActivityFormSchema,
	mutateActivityFormSchema,
} from "@/lib/validations/mutate-activity-form";
import { Activity } from "@/lib/types/activity";

// API

interface Props {
	activity?: Activity;
}

export default function MutateActivityForm({ activity }: Props) {
	const [currentState, setCurrentState] = useState<
		false | "submitting" | "submitted" | "error"
	>(false);
	const submittedEventId = useRef<string | null>(null);

	// 1. Define your form.
	const form = useForm<MutateActivityFormSchema>({
		resolver: zodResolver(mutateActivityFormSchema),
	});

	// Atenção! O botão de "submit" não funcionará caso existam erros (mesmo que não visíveis) no formulário.
	// console.log("Errors: ", form.formState.errors);

	// 2. Define a submit handler.
	async function onSubmit(data: MutateActivityFormSchema) {
		setCurrentState("submitting");

		// console.log(data);
		const { dateFrom, timeFrom, timeTo, participantIds, ...rest } = data;

		const dateFromWithTime = new Date(dateFrom);
		setTimeOnDate(dateFromWithTime, timeFrom);

		// console.log("dateFromWithTime: ", dateFromWithTime);

		const dateToWithTime = new Date(dateFrom);
		setTimeOnDate(dateToWithTime, timeTo);

		await new Promise((resolve) => setTimeout(resolve, 2000));

		setCurrentState("submitted");

		submittedEventId.current = "c03281137c42"; // TODO: Pegar o ID do evento criado/atualizado
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="flex w-full flex-1 flex-col items-center justify-start gap-9"
			>
				<MutateActivityFormContent form={form} isEditing={!!activity} />
			</form>
			<LoadingDialog
				isOpen={currentState === "submitting"}
				title="Estamos realizando a operação..."
			/>
			<SuccessDialog
				isOpen={currentState === "submitted"}
				href={`/dashboard/activities/${submittedEventId.current}`}
				description={
					<>
						A atividade foi {activity ? "atualizada" : "criada"} por
						sucesso e já pode ser visualizada pelos participantes.
						<br />
						{!activity &&
							"Agora, você pode visualizá-la a qualquer momento através da página de atividades."}
					</>
				}
				buttonText="Visualizar atividade"
			/>
			<ErrorDialog
				isOpen={currentState === "error"}
				onClose={() => {
					setCurrentState(false);
				}}
			/>
		</Form>
	);
}

const setTimeOnDate = (date: Date, time: string) => {
	const timeParts = time.split(":");
	date.setHours(Number(timeParts[0]), Number(timeParts[1]));
};
