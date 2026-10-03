"use client";

import { useRef, useState } from "react";

import { useForm, Resolver } from "react-hook-form";
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

// Actions
import { revalidateActivities } from "@/app/actions";

// Types
import { RouterOutput } from "@verific/api";
import { dateToTimeString } from "@/components/pickers/time-picker";

interface Props {
	projectId: string;
	startDate?: Date;
	endDate?: Date;
	activity?: RouterOutput["getActivity"]["activity"];
}

export default function MutateActivityForm({
	projectId,
	startDate,
	endDate,
	activity,
}: Props) {
	const [currentState, setCurrentState] = useState<
		false | "submitting" | "submitted" | "error"
	>(false);
	const submittedActivityId = useRef<string | undefined>(undefined);

	// 1. Define your form.
	const form = useForm<MutateActivityFormSchema>({
		resolver: zodResolver(mutateActivityFormSchema) as Resolver<
			MutateActivityFormSchema,
			any
		>,
		defaultValues: {
			name: activity?.name || "",
			description: activity?.description || "",
			isRegistrationOpen: activity?.isRegistrationOpen || false,
			speakerIds:
				activity?.speakerOnActivity.map(
					(speakerOnActivity) => speakerOnActivity.speaker.id,
				) || [],
			sessions: activity?.sessions?.length
				? activity.sessions.map((session) => ({
						date: new Date(session.startsAt),
						timeFrom: dateToTimeString(session.startsAt),
						timeTo: dateToTimeString(session.endsAt),
						address: session.address || "",
					}))
				: [
						{
							date: new Date(startDate || Date.now()),
							timeFrom: undefined,
							timeTo: undefined,
							address: "",
						},
					],
			tolerance: activity?.tolerance || 0,
			workload: activity?.workload || undefined,
			category: activity?.category || undefined,
			participantsLimit: activity?.participantsLimit || undefined,
			audience: activity?.audience || "external",
			address: activity?.address || "",
		},
	});

	// Atenção! O botão de "submit" não funcionará caso existam erros (mesmo que não visíveis) no formulário.
	// console.log("Errors: ", form.formState.errors);

	const updateMutation = trpc.updateActivity.useMutation();
	const createMutation = trpc.createActivity.useMutation();
	const utils = trpc.useUtils();

	// 2. Define a submit handler.
	async function onSubmit(data: MutateActivityFormSchema) {
		setCurrentState("submitting");

		const { sessions, ...rest } = data;

		const apiSessions = sessions.map((session) => {
			const startsAt = new Date(session.date);
			setTimeOnDate(startsAt, session.timeFrom);
			const endsAt = new Date(session.date);
			setTimeOnDate(endsAt, session.timeTo);
			return {
				startsAt,
				endsAt,
				address: session.address || undefined,
			};
		});

		try {
			if (activity) {
				await updateMutation.mutateAsync({
					activityId: activity.id,
					sessions: apiSessions,
					...rest,
				});

				submittedActivityId.current = activity.id;
				setCurrentState("submitted");
			} else {
				const { activityId } = await createMutation.mutateAsync({
					projectId,
					sessions: apiSessions,
					audience: data.audience || "internal",
					...rest,
				});

				submittedActivityId.current = activityId;
				setCurrentState("submitted");
			}

			await revalidateActivities();
			utils.getActivities.invalidate();
			utils.getActivity.invalidate();
			utils.getDashboardStats.invalidate();
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
					endDate={endDate}
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
	date.setUTCHours(Number(timeParts[0]) + 3, Number(timeParts[1]));
};
