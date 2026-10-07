"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@verific/zod";

import { Loader2, BookLock, InfoIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
import { Form } from "@/components/ui/form";
import { DynamicField } from "@/components/forms/dynamic/DynamicField";

// API
import type { RouterOutput } from "@verific/api";
import { trpc } from "@/lib/trpc/react";
import { buildAnswersSchema } from "@verific/api/schemas";
import { groupFieldsBySection } from "@/lib/forms/layout";
import type { FormState } from "@/lib/types/forms";
import { ErrorDialog, LoadingDialog, SuccessDialog } from "../forms/dialogs";
import Link from "next/link";
import { activityCategoryLabels } from "@verific/drizzle/schema";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip";
import { ActivitySpeakers } from "../activity/activity-card/speakers";
import { ActivityCardTags } from "../activity/activity-card/tags";
import {
	revalidateParticipantActivities,
	revalidateSubscribedActivitiesIdsFromParticipant,
} from "@/app/actions";

interface Props {
	userId?: string | null;
	participantId?: string | null;
	activity: RouterOutput["getActivity"]["activity"];
}

type ActivityAnswerValue =
	| string
	| number
	| boolean
	| string[]
	| null
	| undefined;

type ActivityAnswers = Record<string, ActivityAnswerValue>;

export function JoinActivityDialog({ userId, participantId, activity }: Props) {
	const [currentState, setCurrentState] = useState<FormState>(false);
	const isLoading = currentState === "submitting";

	const router = useRouter();
	const utils = trpc.useUtils();

	const addMutation = trpc.addActivityParticipants.useMutation();

	const { data: publishedForm } = trpc.getPublishedForm.useQuery({
		projectId: activity.projectId,
		activityId: activity.id,
	});

	const formFields = useMemo(
		() => (publishedForm?.fields ?? []).filter((f) => f.isVisible),
		[publishedForm],
	);
	const formSections = useMemo(
		() => publishedForm?.sections ?? [],
		[publishedForm],
	);
	const hasActivityForm = formFields.length > 0;

	const fieldsForValidation = useMemo(
		() =>
			formFields.map((f) => ({
				id: f.id,
				sectionId: f.sectionId,
				key: f.key,
				label: f.label,
				type: f.type,
				required: f.required,
				options: f.options,
				allowOther: f.allowOther,
				validation: f.validation,
				isVisible: f.isVisible,
				isActive: f.isActive,
			})),
		[formFields],
	);

	const sectionsForVisibility = useMemo(
		() =>
			formSections.map((s) => ({
				id: s.id,
				visibilityRule:
					(
						s as {
							visibilityRule?: {
								sourceFieldId: string;
								operator:
									| "is_checked"
									| "is_not_checked"
									| "equals"
									| "includes_any"
									| "includes_all";
								values?: string[];
							} | null;
						}
					).visibilityRule ?? null,
			})),
		[formSections],
	);

	const answersResolver = useMemo(() => {
		return async (values: unknown, context: unknown, options: unknown) => {
			const v = (values ?? {}) as { answers?: ActivityAnswers };
			const answersSchema = buildAnswersSchema(
				fieldsForValidation,
				sectionsForVisibility,
				(v.answers ?? {}) as Record<string, unknown>,
			);
			const zod = zodResolver(
				z.object({ answers: answersSchema }) as never,
			);
			return (
				zod as (a: unknown, b: unknown, c: unknown) => Promise<unknown>
			)(values, context, options) as never;
		};
	}, [fieldsForValidation, sectionsForVisibility]);

	const answersForm = useForm<{ answers: ActivityAnswers }>({
		resolver: answersResolver as never,
		defaultValues: { answers: {} },
	});

	const groupedSections = useMemo(
		() => groupFieldsBySection(formFields, formSections),
		[formFields, formSections],
	);

	function onDismiss() {
		router.back();
	}

	async function onSubmit(values?: { answers: ActivityAnswers }) {
		setCurrentState("submitting");

		if (!participantId) {
			setCurrentState("error");
			return;
		}

		try {
			await addMutation.mutateAsync({
				activityId: activity.id,
				participantsIdsToAdd: [participantId],
				...(hasActivityForm
					? {
							formAnswers: {
								answers: values?.answers ?? {},
							},
						}
					: {}),
			});

			if (userId) {
				await revalidateSubscribedActivitiesIdsFromParticipant(userId);
				await revalidateParticipantActivities(userId);
			}

			await utils.getSubscribedActivitiesIdsFromParticipant.invalidate();
			await utils.getActivitiesFromParticipant.invalidate();

			setCurrentState("submitted");
		} catch (error) {
			console.error(error);
			setCurrentState("error");
		}
	}

	if (!participantId) {
		return (
			<Dialog
				open={true}
				onOpenChange={(open) => !open && !isLoading && onDismiss()}
			>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader className="w-full items-center justify-center text-center">
						<BookLock size={42} className="mb-2" />
						<DialogTitle className="w-full text-center">
							É necessário estar inscrito no evento
						</DialogTitle>
						<DialogDescription className="w-full text-center">
							Faça login na plataforma e inscreva-se no evento
							para participar dessa e de outras atividades.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col items-center justify-center gap-2">
						<Button className="w-full" asChild>
							<Link href={`/${activity.project.url}/subscribe`}>
								Inscrever-se no evento
							</Link>
						</Button>
						<DialogFooter className="w-full">
							<DialogClose asChild>
								<Button
									disabled={isLoading}
									className="w-full"
									type="button"
									variant={"outline"}
								>
									Voltar
								</Button>
							</DialogClose>
						</DialogFooter>
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog
			open={true}
			onOpenChange={(open) => !open && !isLoading && onDismiss()}
		>
			<DialogContent
				className={
					hasActivityForm ? "sm:max-w-[600px]" : "sm:max-w-[425px]"
				}
			>
				<DialogHeader className="w-full items-center justify-center text-center">
					<Badge className="mb-2">
						{activityCategoryLabels[activity.category]}
					</Badge>
					<DialogTitle className="w-full text-center">
						{activity.name}
					</DialogTitle>
					<div className="prose prose-sm dark:prose-invert w-full max-w-none text-left leading-snug">
						<ReactMarkdown remarkPlugins={[remarkGfm]}>
							{activity.description || ""}
						</ReactMarkdown>
					</div>
				</DialogHeader>
				<div className="flex w-full flex-col gap-4">
					{activity.speakerOnActivity ? (
						<ActivitySpeakers
							className="w-full"
							speakers={activity.speakerOnActivity.map(
								(s) => s.speaker,
							)}
						/>
					) : null}
					<ActivityCardTags
						tagsClassName="bg-muted"
						activity={activity}
					/>
					{hasActivityForm ? (
						<Form {...answersForm}>
							<div className="flex w-full flex-col gap-4 rounded-sm border p-4">
								<p className="text-sm font-medium">
									Formulário de inscrição
								</p>
								{groupedSections.map((group) => (
									<div
										key={group.section.id}
										className="flex w-full flex-col gap-4"
									>
										{group.section.title ? (
											<p className="text-muted-foreground text-sm font-medium">
												{group.section.title}
											</p>
										) : null}
										{group.rows.map((row, ri) => (
											<div
												key={
													row.fields
														.map((f) => f.id)
														.join("-") ||
													`row-${ri}`
												}
												className={
													row.fields.length === 2
														? "grid w-full grid-cols-1 gap-4 md:grid-cols-2"
														: "w-full"
												}
											>
												{row.fields.map((f) => (
													<DynamicField
														key={f.id}
														field={f}
														control={
															answersForm.control as never
														}
														name={`answers.${f.key}`}
													/>
												))}
											</div>
										))}
									</div>
								))}
							</div>
						</Form>
					) : null}
					{activity?.tolerance ? (
						<div className="bg-muted/50 flex flex-row items-center justify-between gap-3 rounded-sm p-4 text-sm select-none">
							<span className="text-muted-foreground text-sm">
								Este evento possui{" "}
								<strong>fila de espera</strong>.
							</span>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<InfoIcon
											className="mt-0.5"
											size={16}
										/>
									</TooltipTrigger>
									<TooltipContent className="max-w-[22rem]">
										<p>
											Caso não haja confirmação de sua
											presença em {activity.tolerance}m a
											partir do início da atividade, sua
											vaga será cedida a outra pessoa.
										</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					) : null}
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
						onClick={() => {
							if (hasActivityForm) {
								void answersForm.handleSubmit(onSubmit)();
							} else {
								void onSubmit();
							}
						}}
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
