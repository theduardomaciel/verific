"use client";

import { useEffect, useMemo, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
	buildAnswersSchema,
	filterVisibleFields,
	getVisibleSectionIds,
} from "@verific/api/schemas";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

import { DynamicField } from "@/components/forms/dynamic/DynamicField";

import { groupFieldsBySection } from "@/lib/forms/layout";
import { trpc } from "@/lib/trpc/react";

export function EditMyAnswersForm({
	projectId,
	projectUrl,
}: {
	projectId: string;
	projectUrl?: string;
}) {
	const utils = trpc.useUtils();
	const published = trpc.getPublishedForm.useQuery({ projectId });
	const myAnswers = trpc.getMyAnswers.useQuery({ projectId });
	const myProfile = trpc.getMyProfileData.useQuery(
		{ projectUrl: projectUrl ?? "" },
		{ enabled: Boolean(projectUrl), retry: false },
	);
	const setVisibility = trpc.setFieldVisibility.useMutation({
		onSuccess: () => {
			void utils.getMyProfileData.invalidate();
		},
		onError: (e) => toast.error(e.message),
	});
	// Por chave do campo: o layout pode apontar para outra versão
	const visibility = (myProfile.data?.visibility ?? {}) as Record<
		string,
		boolean
	>;
	const linkedKeys = useMemo(
		() => new Set(myProfile.data?.linkedKeys ?? []),
		[myProfile.data],
	);

	const fields = useMemo(
		() =>
			(published.data?.fields ?? []).filter(
				(f) => f.isVisible && f.editableAfterSignup,
			),
		[published.data],
	);
	const sections = useMemo(
		() => published.data?.sections ?? [],
		[published.data],
	);
	// Uma seção pode depender de um campo que não se edita mais
	const ruleFields = useMemo(
		() =>
			(published.data?.fields ?? []).map((f) => ({
				id: f.id,
				key: f.key,
			})),
		[published.data],
	);

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
		[sections],
	);

	const defaultValues = useMemo(() => {
		const answers = (myAnswers.data?.answers ?? []) as Array<{
			fieldId: string;
			value: unknown;
			field?: { key?: string } | null;
		}>;
		const byKey: Record<string, unknown> = {};
		for (const a of answers) {
			const key = a.field?.key;
			if (key) byKey[key] = a.value;
		}
		for (const f of fields) {
			const v = byKey[f.key];
			if (v instanceof Date)
				byKey[f.key] = (v as Date).toISOString().slice(0, 10);
		}
		return byKey;
	}, [myAnswers.data, fields]);

	const resolver = useMemo(() => {
		return async (values: unknown, context: unknown, options: unknown) => {
			const schema = buildAnswersSchema(
				fieldsForValidation,
				sectionsForVisibility,
				(values ?? {}) as Record<string, unknown>,
				ruleFields,
			);
			const zod = zodResolver(schema as never);
			return (
				zod as (a: unknown, b: unknown, c: unknown) => Promise<unknown>
			)(values, context, options) as never;
		};
	}, [fieldsForValidation, sectionsForVisibility, ruleFields]);

	const form = useForm<Record<string, unknown>>({
		resolver: resolver as never,
		values: defaultValues,
	});

	const watched = (useWatch({ control: form.control }) ?? {}) as Record<
		string,
		unknown
	>;

	const grouped = useMemo(() => {
		if (!sectionsForVisibility.some((s) => s.visibilityRule)) {
			return groupFieldsBySection(fields, sections);
		}
		const visible = filterVisibleFields(
			fields,
			sectionsForVisibility,
			watched,
			ruleFields,
		);
		const ids = getVisibleSectionIds(
			sectionsForVisibility,
			ruleFields,
			watched,
		);
		return groupFieldsBySection(visible, sections).filter((g) =>
			ids.has(g.section.id),
		);
	}, [fields, sections, sectionsForVisibility, ruleFields, watched]);

	useEffect(() => {
		const allowed = new Set(
			filterVisibleFields(
				fieldsForValidation,
				sectionsForVisibility,
				watched,
				ruleFields,
			).map((f) => f.key),
		);
		const hidden = fieldsForValidation
			.map((f) => f.key)
			.filter((k) => !allowed.has(k));
		if (hidden.length > 0) form.clearErrors(hidden as never);
	}, [grouped]);

	const mutation = trpc.updateMyAnswers.useMutation({
		onSuccess: async () => {
			await utils.getMyAnswers.invalidate();
			toast.success("Respostas atualizadas!");
		},
		onError: (e) => toast.error(e.message),
	});

	// Respostas guardadas de seções que a edição escondeu: saem ao salvar
	const [pendingSave, setPendingSave] = useState<{
		answers: Record<string, unknown>;
		lostLabels: string[];
	} | null>(null);

	function save(answers: Record<string, unknown>) {
		mutation.mutate({
			projectId,
			answers: answers as Record<
				string,
				string | number | boolean | string[] | null
			>,
		});
	}

	function handleValid(values: Record<string, unknown>) {
		// `values` só tem os campos editáveis; as regras também leem as
		// respostas guardadas dos outros
		const visible = filterVisibleFields(
			fieldsForValidation,
			sectionsForVisibility,
			{ ...form.getValues(), ...values },
			ruleFields,
		);
		const allowed = new Set(visible.map((f) => f.key));
		const stripped: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(values)) {
			if (allowed.has(k)) stripped[k] = v;
		}
		const lostLabels = fields
			.filter(
				(f) =>
					!allowed.has(f.key) &&
					!isBlank(defaultValues[f.key] as unknown),
			)
			.map((f) => f.label);
		if (lostLabels.length > 0) {
			setPendingSave({ answers: stripped, lostLabels });
			return;
		}
		save(stripped);
	}

	if (published.isPending || myAnswers.isPending)
		return <Skeleton className="h-200 w-full" />;
	if (!myAnswers.data?.participant) return null;
	if (fields.length === 0) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Minhas respostas</CardTitle>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form
						onSubmit={(e) => void form.handleSubmit(handleValid)(e)}
						className="flex flex-col gap-4"
					>
						{grouped.map((group) => (
							<div
								key={group.section.id}
								className="flex flex-col gap-4"
							>
								<h4 className="text-sm font-bold">
									{group.section.title}
								</h4>
								{group.rows.map((row, ri) => (
									<div
										key={
											row.fields
												.map((f) => f.id)
												.join("-") || `row-${ri}`
										}
										className={
											row.fields.length === 2
												? "grid w-full grid-cols-1 gap-4 md:grid-cols-2"
												: "w-full"
										}
									>
										{row.fields.map((f) => {
											const linked = linkedKeys.has(
												f.key,
											);
											const showToggle = Boolean(
												linked &&
												f.required &&
												myProfile.data,
											);
											const showHint = Boolean(
												linked && !showToggle,
											);
											return (
												<div
													key={f.id}
													className="flex flex-col gap-1"
												>
													<DynamicField
														key={f.id}
														field={f}
														control={
															form.control as never
														}
														name={f.key}
													/>
													{showToggle && (
														<div className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
															<Label
																htmlFor={`profile-visible-${f.id}`}
																className="text-xs font-normal"
															>
																Visível no
																perfil
															</Label>
															<Switch
																id={`profile-visible-${f.id}`}
																checked={
																	visibility[
																		f.key
																	] ?? true
																}
																onCheckedChange={(
																	checked,
																) =>
																	setVisibility.mutate(
																		{
																			projectUrl:
																				projectUrl ??
																				"",
																			fieldId:
																				f.id,
																			visible:
																				checked,
																		},
																	)
																}
															/>
														</div>
													)}
													{showHint && (
														<p className="text-muted-foreground flex items-center gap-1 text-xs">
															<Eye className="h-3 w-3" />
															Visível no seu
															perfil
														</p>
													)}
												</div>
											);
										})}
									</div>
								))}
							</div>
						))}
						<Button type="submit" disabled={mutation.isPending}>
							{mutation.isPending
								? "Salvando..."
								: "Salvar respostas"}
						</Button>
					</form>
				</Form>
			</CardContent>
			<AlertDialog
				open={pendingSave !== null}
				onOpenChange={(open) => {
					if (!open) setPendingSave(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Apagar respostas?</AlertDialogTitle>
						<AlertDialogDescription>
							Com essa mudança, estas perguntas deixam de se
							aplicar e as respostas delas serão apagadas:{" "}
							{pendingSave?.lostLabels.join(", ")}.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Voltar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (pendingSave) save(pendingSave.answers);
								setPendingSave(null);
							}}
						>
							Salvar e apagar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}

function isBlank(value: unknown) {
	return (
		value === undefined ||
		value === null ||
		value === "" ||
		(Array.isArray(value) && value.length === 0)
	);
}
