"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@verific/zod";
import { toast } from "sonner";

import { buildAnswersSchema, filterVisibleFields, getVisibleSectionIds } from "@verific/api/schemas";
import { groupFieldsBySection } from "@/lib/forms/layout";
import { DynamicField } from "@/components/forms/dynamic/DynamicField";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ProfileFieldsSection } from "@/components/forms/profile-fields-section";
import type { GenericForm } from "@/components/forms";
import type { RouterOutput } from "@verific/api";
import { trpc } from "@/lib/trpc/react";

type BuilderField = RouterOutput["getVersion"]["fields"][number];
type BuilderSection = RouterOutput["getVersion"]["sections"][number];

/**
 * Faithful, interactive preview of what the participant will see.
 * Renders the same `DynamicField` components in the same row grouping
 * as the public JoinForm, with real validation — submitting only
 * validates locally and never sends data.
 */
export function FormPreview({
	fields,
	sections,
	isLoading = false,
	projectId,
}: {
	fields: BuilderField[];
	sections: BuilderSection[];
	isLoading?: boolean;
	/** Opcional: só o formulário do evento mostra a seção de perfil. */
	projectId?: string;
}) {
	const projectQuery = trpc.getProject.useQuery(
		{ id: projectId ?? "" },
		{ enabled: Boolean(projectId) },
	);
	const showProfileSection = Boolean(
		projectQuery.data?.project.profilesEnabled &&
			projectQuery.data?.project.profileFillAtSignup,
	);
	const baseVisible = useMemo(
		() => fields.filter((f) => f.isActive && f.isVisible),
		[fields],
	);
	const hiddenCount = fields.length - baseVisible.length;

	const fieldsForValidation = useMemo(
		() =>
			baseVisible.map((f) => ({
				id: f.id,
				sectionId: f.sectionId,
				key: f.key,
				label: f.label,
				type: f.type,
				required: f.required,
				options: f.options,
				allowOther: (f as { allowOther?: boolean | null }).allowOther,
				validation: f.validation,
				isVisible: f.isVisible,
				isActive: f.isActive,
			})),
		[baseVisible],
	);

	const sectionsForVisibility = useMemo(
		() =>
			sections.map((s) => ({
				id: s.id,
				visibilityRule: (s as { visibilityRule?: { sourceFieldId: string; operator: "is_checked" | "is_not_checked" | "equals" | "includes_any" | "includes_all"; values?: string[] } | null }).visibilityRule ?? null,
			})),
		[sections],
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

	const resolver = useMemo(() => {
		return async (values: unknown, context: unknown, options: unknown) => {
			const v = (values ?? {}) as { answers?: Record<string, unknown> };
			const answersSchema = buildAnswersSchema(
				fieldsForValidation,
				sectionsForVisibility,
				(v.answers ?? {}) as Record<string, unknown>,
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
		defaultValues: { name: "", answers: {}, profile: {} },
	});

	const watchedAnswers = (form.watch("answers") ?? {}) as Record<string, unknown>;

	const grouped = useMemo(() => {
		if (!sectionsForVisibility.some((s) => s.visibilityRule)) {
			return groupFieldsBySection(baseVisible, sections);
		}
		const visible = filterVisibleFields(baseVisible, sectionsForVisibility, watchedAnswers);
		const ids = getVisibleSectionIds(sectionsForVisibility, fieldsForValidation, watchedAnswers);
		return groupFieldsBySection(visible, sections).filter((g) => ids.has(g.section.id));
	}, [baseVisible, sections, sectionsForVisibility, fieldsForValidation, watchedAnswers]);

	function onSubmit() {
		toast.success("Pré-visualização válida! Nenhum dado foi enviado.");
	}

	function onInvalid() {
		toast.error("Verifique os campos destacados.");
	}

	if (isLoading) {
		return (
			<Card>
				<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
					<CardTitle className="flex flex-wrap items-center gap-2">
						Visão do participante
						<Badge variant="secondary">Pré-visualização</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent className="flex w-full flex-col gap-6">
					<div className="flex flex-col gap-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-10 w-full" />
					</div>
					<div className="flex flex-col gap-2">
						<Skeleton className="h-4 w-40" />
						<Skeleton className="h-10 w-full" />
					</div>
					<div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
						<div className="flex flex-col gap-2">
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div className="flex flex-col gap-2">
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-10 w-full" />
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
				<CardTitle className="flex flex-wrap items-center gap-2">
					Visão do participante
					<Badge variant="secondary">Pré-visualização</Badge>
				</CardTitle>
				{hiddenCount > 0 && (
					<span className="text-muted-foreground text-xs">
						{hiddenCount} campo{hiddenCount === 1 ? "" : "s"} oculto
						{hiddenCount === 1 ? "" : "s"} não exibido
						{hiddenCount === 1 ? "" : "s"}
					</span>
				)}
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit, onInvalid)}
						className="flex w-full flex-col gap-6"
					>
						{grouped.map((group, gi) => (
							<div key={group.section.id} className="flex w-full flex-col gap-3">
								<h4 className="text-sm font-bold">
									{gi + 1}. {group.section.title}
								</h4>
								{gi === 0 && (
									<>
										<FormField
											control={form.control}
											name="name"
											render={({ field }) => (
												<FormItem className="w-full">
													<FormLabel>
														Nome completo{" "}
														<span className="text-destructive ml-1">*</span>
													</FormLabel>
													<FormControl>
														<Input
															placeholder="Fulano da Silva"
															{...field}
															value={field.value ?? ""}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										{showProfileSection && (
											<ProfileFieldsSection
												form={form as unknown as GenericForm}
											/>
										)}
									</>
								)}
								{group.rows.length > 0 && (
									<div className="flex w-full flex-col gap-6">
										{group.rows.map((row, ri) => (
											<div
												key={
													row.fields.map((f) => f.id).join("-") || `row-${ri}`
												}
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
								)}
							</div>
						))}
						{grouped.length === 0 && (
							<>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem className="w-full">
											<FormLabel>
												Nome completo{" "}
												<span className="text-destructive ml-1">*</span>
											</FormLabel>
											<FormControl>
												<Input
													placeholder="Fulano da Silva"
													{...field}
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								{showProfileSection && (
									<ProfileFieldsSection
										form={form as unknown as GenericForm}
									/>
								)}
							</>
						)}
						<div className="flex w-full flex-row items-center justify-between gap-4">
							<p className="text-muted-foreground text-sm">
								Não se preocupe, enviar o formulário aqui só
								valida os campos — nada é salvo ;)
							</p>
							<Button
								className="h-10 w-full px-4! font-bold md:w-fit"
								type="submit"
							>
								Enviar (simulação)
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
