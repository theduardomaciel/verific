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
import { MutateActivityFormContent } from "@/components/forms/MutateActivityForm/Content";

// Validation
import {
	type MutateActivityFormSchema,
	mutateActivityFormSchema,
} from "@/lib/validations/forms/mutate-activity-form";

// API
import { trpc } from "@/lib/trpc/react";

// Types
import { RouterOutput } from "@verific/api";
import { dateToTimeString } from "@/components/pickers/time-picker";

interface Props {
	projectId: string;
	projectDate?: string;
	activity?: RouterOutput["getActivity"]["activity"];
}

export default function MutateActivityForm({
	projectId,
	projectDate,
	activity,
}: Props) {
	const [currentState, setCurrentState] = useState<
		false | "submitting" | "submitted" | "error"
	>(false);
	const submittedActivityId = useRef<string | undefined>(undefined);

	// 1. Define your form.
	const form = useForm<MutateActivityFormSchema>({
		resolver: zodResolver(mutateActivityFormSchema),
		defaultValues: {
			name: activity?.name || "",
			description: activity?.description || "",
			speakerId: activity?.speaker.id.toString() || "",
			dateFrom: activity?.dateFrom
				? new Date(activity.dateFrom)
				: new Date(projectDate || Date.now()),
			tolerance: activity?.tolerance || 0,
			timeFrom: activity
				? dateToTimeString(activity.dateFrom)
				: undefined,
			workload: activity?.workload || undefined,
			timeTo: activity ? dateToTimeString(activity.dateTo) : undefined,
			category: activity?.category || undefined,
			participantsLimit: activity?.participantsLimit || undefined,
			audience: activity?.audience || "internal",
		},
	});

	// Atenção! O botão de "submit" não funcionará caso existam erros (mesmo que não visíveis) no formulário.
	// console.log("Errors: ", form.formState.errors);

	const updateMutation = trpc.updateActivity.useMutation();
	const createMutation = trpc.createActivity.useMutation();

	// 2. Define a submit handler.
	async function onSubmit(data: MutateActivityFormSchema) {
		setCurrentState("submitting");

		// console.log(data);
		const { dateFrom, timeFrom, timeTo, ...rest } = data;

		const dateFromWithTime = new Date(dateFrom);
		setTimeOnDate(dateFromWithTime, timeFrom);

		// console.log("dateFromWithTime: ", dateFromWithTime);

		const dateToWithTime = new Date(dateFrom);
		setTimeOnDate(dateToWithTime, timeTo);

		try {
			if (activity) {
				await updateMutation.mutateAsync({
					activityId: activity.id,
					dateFrom: dateFromWithTime,
					dateTo: dateToWithTime,
					...rest,
				});

				submittedActivityId.current = activity.id;
				setCurrentState("submitted");
			} else {
				const { activityId } = await createMutation.mutateAsync({
					projectId,
					dateFrom: dateFromWithTime,
					dateTo: dateToWithTime,
					audience: data.audience || "internal",
					...rest,
				});

				submittedActivityId.current = activityId;
				setCurrentState("submitted");
			}
		} catch (error) {
			console.error(error);
			setCurrentState("error");
		}
	}

	return (
		<Form {...form}>
			<form
				id="mutate-activity-form"
				onSubmit={form.handleSubmit(onSubmit, () => {
					console.log(form.getValues());
					console.log(form.formState.errors);
				})}
				className="flex w-full flex-1 flex-col items-center justify-start gap-9"
			>
				<MutateActivityFormContent
					projectId={projectId}
					form={form}
					isEditing={!!activity}
				/>
			</form>
			<LoadingDialog
				isOpen={currentState === "submitting"}
				title="Estamos realizando a operação..."
			/>
			<SuccessDialog
				isOpen={currentState === "submitted"}
				href={`/dashboard/activities/${submittedActivityId.current}`}
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
