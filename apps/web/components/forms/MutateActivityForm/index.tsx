"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { RouterOutput } from "@verific/api";
import { dayKey, toWallTime, zonedInstant } from "@verific/drizzle/time";

import { Form } from "@/components/ui/form";

import { useEventTimeZone } from "@/components/event-time-zone";
import {
	ErrorDialog,
	LoadingDialog,
	SuccessDialog,
} from "@/components/forms/dialogs";
import { MutateActivityFormContent } from "@/components/forms/MutateActivityForm/Content";

import { refreshRoute } from "@/app/actions";
import { trpc } from "@/lib/trpc/react";
import {
	type MutateActivityFormSchema,
	mutateActivityFormSchema,
} from "@/lib/validations/forms/mutate-activity-form";

import type { Resolver } from "react-hook-form";

interface Props {
	projectId: string;
	startDate?: Date;
	endDate?: Date;
	activity?: RouterOutput["getActivity"]["activity"];
	registrationFormAction?: React.ReactNode;
	enableConfigureAfterSave?: boolean;
}

export default function MutateActivityForm({
	projectId,
	startDate,
	endDate,
	activity,
	registrationFormAction,
	enableConfigureAfterSave,
}: Props) {
	const [currentState, setCurrentState] = useState<
		false | "submitting" | "submitted" | "error"
	>(false);
	const [submittedActivityId, setSubmittedActivityId] = useState<string>();
	const configureAfterSave = useRef(false);
	const shouldResetAfterHide = useRef(false);
	const isSubmitting = useRef(false);
	const router = useRouter();

	const timeZone = useEventTimeZone();
	// Dia padrão fixado na montagem (inicializador executa uma única vez).
	const [defaultSessionDay] = useState(() =>
		dayKey(startDate ?? new Date(), timeZone),
	);
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
			tagIds: activity?.tags?.map((tag) => tag.id) || [],
			sessions: activity?.sessions?.length
				? activity.sessions.map((session) => {
						const start = toWallTime(session.startsAt, timeZone);
						return {
							id: session.id,
							date: start.day,
							timeFrom: start.time,
							timeTo: toWallTime(session.endsAt, timeZone).time,
							address: session.address || "",
						};
					})
				: [
						{
							date: defaultSessionDay,
							timeFrom: undefined,
							timeTo: undefined,
							address: "",
						},
					],
			tolerance: activity?.tolerance ? activity.tolerance : null,
			workload: activity?.workload || undefined,
			allowOverlap: activity?.allowOverlap ?? false,
			waitlistEnabled: activity?.waitlistEnabled ?? true,
			waitlistOfferMinutes:
				activity?.waitlistOfferMinutes ??
				(activity?.waitlistOfferHours ?? 12) * 60,
			category: activity?.category || undefined,
			participantsLimit: activity?.participantsLimit ?? null,
			audience: activity?.audience || "external",
			address: activity?.address || "",
		},
	});

	// Atenção! O botão de "submit" não funcionará caso existam erros (mesmo que não visíveis) no formulário.

	const updateMutation = trpc.updateActivity.useMutation();
	const createMutation = trpc.createActivity.useMutation();
	const utils = trpc.useUtils();

	// Com Cache Components, o Next.js preserva o estado via Activity ao
	// navegar. Sem isso, voltar para esta página mostraria o SuccessDialog
	// obsoleto (currentState ainda "submitted"). Reseta o status ao ocultar.
	// Ver docs/app/02-guides/preserving-ui-state.md ("Resetting stale status messages").
	useLayoutEffect(() => {
		return () => {
			if (shouldResetAfterHide.current) {
				shouldResetAfterHide.current = false;
				setCurrentState(false);
				setSubmittedActivityId(undefined);
				form.reset();
			}
		};
	}, [form]);

	// 2. Define a submit handler.
	async function onSubmit(data: MutateActivityFormSchema) {
		// Guard against double submission (double-click, Enter + click),
		// which would create duplicate activities.
		if (isSubmitting.current) return;
		isSubmitting.current = true;
		setCurrentState("submitting");

		const { sessions, ...rest } = data;

		const apiSessions = sessions.map((session) => {
			return {
				id: session.id,
				startsAt: zonedInstant(
					session.date,
					session.timeFrom,
					timeZone,
				),
				endsAt: zonedInstant(session.date, session.timeTo, timeZone),
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

				setSubmittedActivityId(activity.id);
				setCurrentState("submitted");
				shouldResetAfterHide.current = true;
			} else {
				const { activityId } = await createMutation.mutateAsync({
					projectId,
					sessions: apiSessions,
					audience: data.audience || "internal",
					...rest,
				});

				setSubmittedActivityId(activityId);

				if (configureAfterSave.current) {
					configureAfterSave.current = false;
					void refreshRoute().catch(console.error);
					void utils.getActivities.invalidate();
					router.push(`/dashboard/activities/${activityId}/form`);
					return;
				}

				setCurrentState("submitted");
				shouldResetAfterHide.current = true;
			}
		} catch (error) {
			console.error(error);
			setCurrentState("error");
			return;
		} finally {
			isSubmitting.current = false;
		}

		// Já salvo: uma falha ao atualizar a tela não vira erro de envio
		void refreshRoute().catch(console.error);
		void utils.getActivities.invalidate();
		void utils.getActivity.invalidate();
		void utils.getDashboardStats.invalidate();
	}

	return (
		<Form {...form}>
			<form
				id="mutate-activity-form"
				onSubmit={(e) =>
					void form.handleSubmit(onSubmit, () => {
						console.log(form.getValues());
						console.log(form.formState.errors);
					})(e)
				}
				className="flex w-full flex-1 flex-col items-center justify-start gap-9"
			>
				<MutateActivityFormContent
					projectId={projectId}
					period={
						startDate && endDate
							? { startDate, endDate }
							: undefined
					}
					form={form}
					isEditing={!!activity}
					isPending={currentState === "submitting"}
					registrationFormAction={registrationFormAction}
					onSecondarySubmit={
						enableConfigureAfterSave && !activity
							? () => {
									configureAfterSave.current = true;
									void form.handleSubmit(onSubmit)();
								}
							: undefined
					}
				/>
			</form>
			<LoadingDialog
				isOpen={currentState === "submitting"}
				title="Estamos realizando a operação..."
			/>
			<SuccessDialog
				isOpen={currentState === "submitted"}
				onClose={() => {
					const destination = `/dashboard/activities/${submittedActivityId}`;
					shouldResetAfterHide.current = false;
					setCurrentState(false);
					setSubmittedActivityId(undefined);
					form.reset();
					router.replace(destination);
				}}
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
