"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@verific/zod";

// Components
import { FormSection, SectionFooter } from "@/components/forms";
import { Form, FormWrapper } from "@/components/ui/form";
import { DynamicField } from "@/components/forms/dynamic/DynamicField";
import {
	ErrorDialog,
	LoadingDialog,
	SuccessDialog,
} from "@/components/forms/dialogs";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import JoinForm0 from "./Section0";
import {
	ProfileFieldsSection,
	toProfileInput,
} from "@/components/forms/profile-fields-section";
import { isFilled } from "@/components/forms/profile-normalize";
import {
	profileInputSchema,
	shouldShowProfileAtSignup,
} from "@verific/drizzle/profile";

// Validation
import { buildAnswersSchema, filterVisibleFields } from "@verific/api/schemas";
import { groupFieldsBySection } from "@/lib/forms/layout";
import { getVisibleSectionIds } from "@verific/api/schemas";
import type { GenericForm } from "..";

// Types
import type { User } from "@verific/auth";

// API
import { trpc } from "@/lib/trpc/react";
import { useRouter } from "next/navigation";
import { revalidateParticipantEnrollment } from "@/app/actions";

interface JoinFormProps {
	user?: User;
	project: {
		id: string;
		url: string;
		name?: string;
		logo?: string;
		colors?: string[];
		profilesEnabled?: boolean;
		profileFillAtSignup?: boolean;
	};
}

export default function JoinForm({ user, project }: JoinFormProps) {
	const router = useRouter();
	const [currentState, setCurrentState] = useState<
		false | "submitting" | "error" | "submitted"
	>(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [createdShortId, setCreatedShortId] = useState<string | null>(null);

	const { data: formData, isPending: isFormPending } = trpc.getPublishedForm.useQuery({
		projectId: project.id,
	});
	const submitMutation = trpc.submitAnswers.useMutation();

	const fields = useMemo(() => formData?.fields ?? [], [formData]);
	const sections = useMemo(() => formData?.sections ?? [], [formData]);

	const baseVisibleFields = useMemo(() => fields.filter((f) => f.isVisible), [fields]);

	const fieldsForValidation = useMemo(
		() =>
			fields.map((f) => ({
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
		[fields],
	);

	const sectionsForVisibility = useMemo(
		() =>
			sections.map((s) => ({
				id: s.id,
				visibilityRule: (s as { visibilityRule?: { sourceFieldId: string; operator: "is_checked" | "is_not_checked" | "equals" | "includes_any" | "includes_all"; values?: string[] } | null }).visibilityRule ?? null,
			})),
		[sections],
	);

	const hasConditional = useMemo(
		() => sectionsForVisibility.some((s) => s.visibilityRule),
		[sectionsForVisibility],
	);

	const nameSchema = useMemo(
		() =>
			z
				.string({ error: "Obrigatório" })
				.min(2, { message: "Informe seu nome completo." })
				.refine((v) => v.trim().split(/\s+/).length >= 2, {
					message: "Informe nome e sobrenome.",
				}),
		[],
	);

	// Visibility-aware resolver: rebuilds the answers schema from the
	// submitted values on every validation, so required fields in hidden
	// sections never block submit.
	const resolver = useMemo(() => {
		return async (
			values: unknown,
			context: unknown,
			options: unknown,
		) => {
			const v = (values ?? {}) as { name?: unknown; answers?: Record<string, unknown> };
			const answers = (v.answers ?? {}) as Record<string, unknown>;
			const answersSchema = buildAnswersSchema(
				fieldsForValidation,
				sectionsForVisibility,
				answers,
			);
			const schema = z.object({ name: nameSchema, answers: answersSchema });
			const zod = zodResolver(schema as never);
			return (zod as (a: unknown, b: unknown, c: unknown) => Promise<unknown>)(
				values,
				context,
				options,
			) as never;
		};
	}, [fieldsForValidation, sectionsForVisibility, nameSchema]);

	const form = useForm<{
		name: string;
		answers: Record<string, unknown>;
		profile: Record<string, unknown>;
	}>({
		resolver: resolver as never,
		defaultValues: { name: user?.name || "", answers: {}, profile: {} },
	});

	const showProfileSection = shouldShowProfileAtSignup(project);

	const watchedAnswers = form.watch("answers") ?? {};
	const watchedName = form.watch("name") ?? "";

	const { visibleFields, groupedSections } = useMemo(() => {
		if (!hasConditional) {
			return {
				visibleFields: baseVisibleFields,
				groupedSections: groupFieldsBySection(baseVisibleFields, sections),
			};
		}
		const visible = filterVisibleFields(
			baseVisibleFields.map((f) => ({ ...f })),
			sectionsForVisibility,
			watchedAnswers as Record<string, unknown>,
		);
		// Keep trigger answers even when their section is hidden is handled
		// by filterVisibleFields; just regroup.
		const grouped = groupFieldsBySection(visible, sections).filter((g) =>
			getVisibleSectionIds(sectionsForVisibility, fieldsForValidation, watchedAnswers as Record<string, unknown>).has(g.section.id),
		);
		return { visibleFields: visible, groupedSections: grouped };
	}, [hasConditional, baseVisibleFields, sections, sectionsForVisibility, fieldsForValidation, watchedAnswers]);

	useEffect(() => {
		if (user?.name) form.setValue("name", user.name);
	}, [user?.name, form]);

	useEffect(() => {
		if (!hasConditional) return;
		const allowed = new Set(visibleFields.map((f) => f.key));
		const hidden = fieldsForValidation.map((f) => f.key).filter((k) => !allowed.has(k));
		if (hidden.length > 0) {
			form.clearErrors(hidden.map((k) => `answers.${k}` as never));
		}
	}, [visibleFields, fieldsForValidation, hasConditional, form]);

	useEffect(() => {
		if (!user) form.setValue("name", "");
	}, [user, form]);

	async function onSubmit(values: {
		name: string;
		answers: Record<string, unknown>;
		profile?: Record<string, unknown>;
	}) {
		setCurrentState("submitting");
		if (!user) {
			setErrorMessage("Você precisa estar logado para se inscrever.");
			setCurrentState("error");
			return;
		}
		let profile: Record<string, unknown> | undefined;
		if (showProfileSection) {
			const parsed = profileInputSchema.safeParse(
				toProfileInput((values.profile ?? {}) as never),
			);
			if (!parsed.success) {
				setErrorMessage(
					"Verifique os dados do perfil (URLs e e-mail devem ser válidos).",
				);
				setCurrentState("error");
				return;
			}
			profile = parsed.data as Record<string, unknown>;
		}
		// Preserve in-memory, discard on submit: strip hidden-section answers.
		const visible = hasConditional
			? filterVisibleFields(fieldsForValidation, sectionsForVisibility, values.answers)
			: fieldsForValidation;
		const allowed = new Set(visible.map((f) => f.key));
		const stripped: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(values.answers ?? {})) {
			if (allowed.has(k)) stripped[k] = v;
		}
		try {
			const result = await submitMutation.mutateAsync({
				projectId: project.id,
				name: values.name,
				answers: stripped as Record<string, string | number | boolean | string[] | null | undefined>,
				...(profile
					? { profile: profile as never }
					: {}),
			});
			setCreatedShortId(result.shortId);
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Erro desconhecido");
			setCurrentState("error");
			return;
		}
		if (user.id) await revalidateParticipantEnrollment(user.id);
		setCurrentState("submitted");
	}

	return (
		<Form {...form}>
			<FormWrapper>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<JoinForm0
						projectUrl={project.url}
						form={form as unknown as GenericForm}
						email={user?.email}
					/>
					{showProfileSection && (
						<ProfileFieldsSection form={form as unknown as GenericForm} />
					)}
					{isFormPending ? (
						<FormSection
							title="Dados da inscrição"
							section={showProfileSection ? 2 : 1}
							form={form as unknown as GenericForm}
							fields={[
								{ name: "Nome completo", value: isFilled(watchedName) },
							]}
						>
							<p className="text-muted-foreground text-sm">Carregando formulário do evento...</p>
							<SectionFooter isFinalSection />
						</FormSection>
					) : groupedSections.length === 0 ? (
						<FormSection
							title="Dados da inscrição"
							section={showProfileSection ? 2 : 1}
							form={form as unknown as GenericForm}
							fields={[
								{ name: "Nome completo", value: isFilled(watchedName) },
							]}
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormLabel>
											Nome completo <span className="text-destructive ml-1">*</span>
										</FormLabel>
										<FormControl>
											<Input placeholder="Fulano da Silva" {...field} value={field.value ?? ""} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<p className="text-muted-foreground text-sm">
								Este evento não exige informações adicionais.
							</p>
							<SectionFooter isFinalSection />
						</FormSection>
					) : (
						groupedSections.map((group, gi) => (
							<FormSection
								key={group.section.id}
								title={group.section.title}
								section={gi + (showProfileSection ? 2 : 1)}
								form={form as unknown as GenericForm}
								fields={group.fields.map((f) => ({
									name: f.label,
									value: isFilled(watchedAnswers[f.key]),
								}))}
							>
								{gi === 0 && (
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem className="w-full">
												<FormLabel>
													Nome completo <span className="text-destructive ml-1">*</span>
												</FormLabel>
												<FormControl>
													<Input placeholder="Fulano da Silva" {...field} value={field.value ?? ""} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
								<div className="flex w-full flex-col gap-6">
									{group.rows.map((row, ri) => (
										<div
											key={row.fields.map((f) => f.id).join("-") || `row-${ri}`}
											className={
												row.fields.length === 2
													? "grid w-full grid-cols-1 gap-6 md:grid-cols-2"
													: "w-full"
											}
										>
											{row.fields.map((f) => (
												<DynamicField
													key={f.id}
													field={f}
													control={form.control as never}
													name={`answers.${f.key}`}
												/>
											))}
										</div>
									))}
								</div>
								<SectionFooter isFinalSection={gi === groupedSections.length - 1} />
							</FormSection>
						))
					)}
				</form>
			</FormWrapper>
			<LoadingDialog isOpen={currentState === "submitting"} title="Estamos realizando seu cadastro..." />
			<SuccessDialog
				isOpen={currentState === "submitted"}
				onClose={() => {
					setCurrentState(false);
					// Ponto de integração do e-mail de confirmação (sem provider
					// ainda): link do perfil `/${project.url}/profile/${shortId}`.
					router.push(
						createdShortId
							? `/${project.url}/profile/${createdShortId}?me=1`
							: `/${project.url}/subscribe`,
					);
				}}
				confettiColors={project.colors}
				className="py-8 sm:!max-w-[40vw]"
				title={
					<div className="flex flex-col items-center justify-center gap-4">
						<span className="flex w-full sm:px-12">
							🎉 Parabéns! <br /> Sua inscrição
							{project.name ? ` em ${project.name}` : ""} foi confirmada com sucesso!
						</span>
					</div>
				}
				description="Você já pode acessar sua conta e se inscrever nas atividades do evento."
			/>
			<ErrorDialog
				isOpen={currentState === "error"}
				title="Erro ao enviar o formulário"
				onClose={() => {
					setCurrentState(false);
					setErrorMessage(null);
				}}
				description={errorMessage || "Por favor, tente novamente mais tarde."}
			/>
		</Form>
	);
}
