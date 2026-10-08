"use client";

import { useMemo, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
// Icons
import { CircleAlert, Loader2 } from "lucide-react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import {
	buildAnswersSchema,
	filterVisibleFields,
	getVisibleSectionIds,
} from "@verific/api/schemas";
import { z } from "@verific/zod";

// Components
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";

import { DynamicField } from "@/components/forms/dynamic/DynamicField";

// Hooks
import { useJoinActivity, type JoinError } from "@/hooks/use-join-activity";
import { useWaitlist } from "@/hooks/use-waitlist";
import { focusFieldControl, getFieldId } from "@/lib/forms/field-id";
// Lib
import { groupFieldsBySection } from "@/lib/forms/layout";

import { ToleranceNotice } from "./enrollment-status";

// Types
import type {
	ActivityDetail,
	PublishedActivityForm,
} from "./use-activity-enrollment-state";

type ActivityAnswerValue =
	| string
	| number
	| boolean
	| string[]
	| null
	| undefined;

interface AnswersFormValues {
	// `unknown` de propósito: casa exatamente com a saída inferida do
	// `buildAnswersSchema`, então o `zodResolver` tipa sem casts. Os
	// valores só ganham o tipo de resposta na borda do envio (validados).
	answers: Record<string, unknown>;
}

interface ActivityEnrollmentFormProps {
	activity: ActivityDetail;
	participantId: string;
	userId: string;
	form: PublishedActivityForm;
	/** `waitlist`: a atividade está lotada e o envio entra na fila. */
	mode?: "enroll" | "waitlist";
	/** Vaga garantida (`enrolled`) ou lugar na fila (`waiting`). */
	onSubmitted: (result: "enrolled" | "waiting") => void;
	/** As vagas acabaram durante o envio; o painel passa para a fila. */
	onFull?: () => void;
}

/**
 * Formulário real de inscrição (`<form>` + submit nativo): Enter envia,
 * resumo de erros com links focáveis, erros de servidor inline e
 * botão com estado de envio. Renderizado só na coluna estreita do
 * painel, por isso um campo por linha.
 */
export function ActivityEnrollmentForm({
	activity,
	participantId,
	userId,
	form: published,
	mode = "enroll",
	onSubmitted,
	onFull,
}: ActivityEnrollmentFormProps) {
	const { join, status } = useJoinActivity({
		activityId: activity.id,
		participantId,
		userId,
	});
	const waitlist = useWaitlist({ activityId: activity.id, userId });
	const [serverError, setServerError] = useState<string | null>(null);

	const fieldsForValidation = useMemo(
		() =>
			published.fields.map((f) => ({
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
		[published.fields],
	);

	// `visibilityRule` já é tipado no schema do drizzle
	// (`SectionVisibilityRule | null`): sem casts aqui.
	const sectionsForVisibility = useMemo(
		() =>
			published.sections.map((s) => ({
				id: s.id,
				visibilityRule: s.visibilityRule ?? null,
			})),
		[published.sections],
	);

	const hasConditional = useMemo(
		() => sectionsForVisibility.some((s) => s.visibilityRule),
		[sectionsForVisibility],
	);

	// Esquema base memoizado nos dados publicados (não nos valores).
	const staticAnswersSchema = useMemo(
		() => buildAnswersSchema(fieldsForValidation, sectionsForVisibility),
		[fieldsForValidation, sectionsForVisibility],
	);

	// Wrapper `zodResolver` criado uma única vez por formulário publicado.
	// Com seções condicionais o esquema depende dos valores atuais
	// (campos obrigatórios em seções ocultas não podem barrar o envio),
	// então esse caminho reconstrói o esquema por validação — o wrapper
	// só é recriado nesse caso, e reutilizado no caminho estático abaixo.
	const staticResolver = useMemo(
		() => zodResolver(z.object({ answers: staticAnswersSchema })),
		[staticAnswersSchema],
	);

	const resolver = useMemo<Resolver<AnswersFormValues>>(() => {
		if (!hasConditional) return staticResolver;
		return (values, context, options) => {
			const answers = ((values as AnswersFormValues).answers ??
				{}) as Record<string, unknown>;
			const schema = buildAnswersSchema(
				fieldsForValidation,
				sectionsForVisibility,
				answers,
			);
			return zodResolver(z.object({ answers: schema }))(
				values,
				context,
				options,
			);
		};
	}, [
		hasConditional,
		staticResolver,
		fieldsForValidation,
		sectionsForVisibility,
	]);

	const answersForm = useForm<AnswersFormValues>({
		resolver,
		defaultValues: { answers: {} },
		shouldFocusError: true,
	});

	const watchedAnswers = (useWatch({
		control: answersForm.control,
		name: "answers",
	}) ?? {}) as Record<string, unknown>;

	// oxlint-disable-line react-hooks/exhaustive-deps -- watchedAnswers é resultado de watch() e muda a cada render; incluí-lo derrotaria a memoização.
	const groupedSections = useMemo(() => {
		if (!hasConditional) {
			return groupFieldsBySection(published.fields, published.sections);
		}
		const visible = filterVisibleFields(
			published.fields,
			sectionsForVisibility,
			// oxlint-disable-line react-hooks/exhaustive-deps -- vide comentário acima.
			watchedAnswers,
		);
		const visibleIds = getVisibleSectionIds(
			sectionsForVisibility,
			fieldsForValidation,
			watchedAnswers,
		);
		return groupFieldsBySection(visible, published.sections).filter((g) =>
			visibleIds.has(g.section.id),
		);
	}, [
		hasConditional,
		published.fields,
		published.sections,
		sectionsForVisibility,
		fieldsForValidation,
		// oxlint-disable-line react-hooks/exhaustive-deps -- vide comentário acima.
		watchedAnswers,
	]);

	const hasRequired = useMemo(
		() => groupedSections.some((g) => g.fields.some((f) => f.required)),
		[groupedSections],
	);

	const answerErrors = answersForm.formState.errors.answers;
	const errorEntries = useMemo(() => {
		if (
			answersForm.formState.submitCount === 0 ||
			!answerErrors ||
			typeof answerErrors !== "object"
		) {
			return [];
		}
		return Object.entries(answerErrors)
			.map(([key, error]) => {
				const field = published.fields.find((f) => f.key === key);
				const rawMessage =
					typeof error === "object" && error !== null
						? (error as { message?: unknown }).message
						: null;
				const message =
					typeof rawMessage === "string" && rawMessage
						? rawMessage
						: "Inválido";
				return {
					key,
					name: `answers.${key}`,
					label: field?.label ?? key,
					message,
				};
			})
			.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
	}, [answerErrors, answersForm.formState.submitCount, published.fields]);

	const isSubmitting =
		answersForm.formState.isSubmitting ||
		status === "pending" ||
		waitlist.pending === "join";

	// Cópias por motivo de falha (mesmo comportamento de antes: alerta
	// inline destrutivo acima do envio, botão habilitado para retry).
	// `conflict` não aparece aqui: o hook atualiza as leituras e o
	// painel vira o estado bloqueado; abaixo só sai o toast.
	const joinErrorCopy: Record<Exclude<JoinError, "conflict">, string> = {
		"form-required": "Esta atividade pede informações adicionais.",
		full: "As vagas acabaram enquanto você se inscrevia. Envie de novo para entrar na fila de espera.",
		closed: "As inscrições foram encerradas.",
		unknown: "Houve um erro ao confirmar sua inscrição. Tente novamente.",
	};

	async function handleValid(values: AnswersFormValues): Promise<void> {
		if (status === "pending") return;
		setServerError(null);

		// Descarta respostas de seções ocultas antes de enviar.
		const allowed = new Set(
			filterVisibleFields(
				fieldsForValidation,
				sectionsForVisibility,
				values.answers ?? {},
			).map((f) => f.key),
		);
		const stripped: Record<string, ActivityAnswerValue> = {};
		for (const [key, value] of Object.entries(values.answers ?? {})) {
			if (allowed.has(key)) stripped[key] = value as ActivityAnswerValue;
		}

		const answers = published.fields.length > 0 ? stripped : undefined;
		let joinError: JoinError | null;
		if (mode === "waitlist") {
			const { result, error } = await waitlist.join(answers);
			joinError = error;
			if (result) {
				onSubmitted(
					result.status === "enrolled" ? "enrolled" : "waiting",
				);
				return;
			}
		} else {
			joinError = await join(answers);
			if (!joinError) {
				onSubmitted("enrolled");
				return;
			}
			if (joinError === "full") onFull?.();
		}
		if (!joinError) return;
		if (joinError === "conflict") {
			toast.error(
				"Esta atividade conflita com outra em que você já está inscrito.",
			);
			return;
		}
		setServerError(joinErrorCopy[joinError]);
	}

	return (
		<Form {...answersForm}>
			<form
				onSubmit={(e) => void answersForm.handleSubmit(handleValid)(e)}
				noValidate
				className="flex flex-col gap-6"
			>
				{hasRequired ? (
					<p className="text-muted-foreground text-sm">
						Campos marcados com * são obrigatórios.
					</p>
				) : null}

				<fieldset
					disabled={isSubmitting}
					className="flex min-w-0 flex-col gap-6 border-0 p-0"
				>
					{groupedSections.map((group, groupIndex) => (
						<div
							key={group.section.id}
							className="flex flex-col gap-6"
						>
							{groupIndex > 0 && group.section.title ? (
								<Separator />
							) : null}
							{group.section.title ? (
								<fieldset className="flex min-w-0 flex-col gap-4 border-0 p-0">
									<legend className="text-sm font-semibold">
										{group.section.title}
									</legend>
									{group.fields.map((field) => (
										<DynamicField
											key={field.id}
											field={field}
											control={answersForm.control}
											name={`answers.${field.key}`}
										/>
									))}
								</fieldset>
							) : (
								group.fields.map((field) => (
									<DynamicField
										key={field.id}
										field={field}
										control={answersForm.control}
										name={`answers.${field.key}`}
									/>
								))
							)}
						</div>
					))}
				</fieldset>

				{activity.tolerance ? (
					<ToleranceNotice tolerance={activity.tolerance} />
				) : null}

				{errorEntries.length > 0 ? (
					<Alert variant="destructive">
						<CircleAlert className="h-4 w-4" />
						<AlertTitle>Corrija os campos abaixo</AlertTitle>
						<AlertDescription>
							<ul className="flex flex-col gap-1">
								{errorEntries.map((entry) => (
									<li key={entry.key}>
										<a
											href={`#${getFieldId(entry.name)}`}
											onClick={(e) => {
												e.preventDefault();
												focusFieldControl(
													getFieldId(entry.name),
												);
											}}
											className="underline underline-offset-4"
										>
											{entry.label}: {entry.message}
										</a>
									</li>
								))}
							</ul>
						</AlertDescription>
					</Alert>
				) : null}

				{serverError ? (
					<Alert variant="destructive">
						<CircleAlert className="h-4 w-4" />
						<AlertTitle>Não foi possível concluir</AlertTitle>
						<AlertDescription>{serverError}</AlertDescription>
					</Alert>
				) : null}

				<Button
					type="submit"
					size="lg"
					disabled={isSubmitting}
					aria-busy={isSubmitting}
					className="min-h-11 w-full"
				>
					{isSubmitting ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" />
							{mode === "waitlist"
								? "Entrando na fila..."
								: "Inscrevendo..."}
						</>
					) : mode === "waitlist" ? (
						"Entrar na fila"
					) : (
						"Inscrever-se"
					)}
				</Button>
			</form>
		</Form>
	);
}
