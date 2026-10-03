"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/react";
import { buildAnswersSchema, filterVisibleFields, getVisibleSectionIds } from "@verific/api/schemas";
import { groupFieldsBySection } from "@/lib/forms/layout";
import { DynamicField } from "@/components/forms/dynamic/DynamicField";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EditMyAnswersForm({ projectId }: { projectId: string }) {
	const utils = trpc.useUtils();
	const published = trpc.getPublishedForm.useQuery({ projectId });
	const myAnswers = trpc.getMyAnswers.useQuery({ projectId });

	const fields = useMemo(
		() => (published.data?.fields ?? []).filter((f) => f.isVisible && f.editableAfterSignup),
		[published.data],
	);
	const sections = useMemo(() => published.data?.sections ?? [], [published.data]);

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

	const defaultValues = useMemo(() => {
		const answers = (myAnswers.data?.answers ?? []) as Array<{ fieldId: string; value: unknown; field?: { key?: string } | null }>;
		const byKey: Record<string, unknown> = {};
		for (const a of answers) {
			const key = a.field?.key;
			if (key) byKey[key] = a.value;
		}
		for (const f of fields) {
			const v = byKey[f.key];
			if (v instanceof Date) byKey[f.key] = (v as Date).toISOString().slice(0, 10);
		}
		return byKey;
	}, [myAnswers.data, fields]);

	const resolver = useMemo(() => {
		return async (values: unknown, context: unknown, options: unknown) => {
			const schema = buildAnswersSchema(
				fieldsForValidation,
				sectionsForVisibility,
				(values ?? {}) as Record<string, unknown>,
			);
			const zod = zodResolver(schema as never);
			return (zod as (a: unknown, b: unknown, c: unknown) => Promise<unknown>)(
				values,
				context,
				options,
			) as never;
		};
	}, [fieldsForValidation, sectionsForVisibility]);

	const form = useForm<Record<string, unknown>>({
		resolver: resolver as never,
		values: defaultValues,
	});

	const watched = (form.watch() ?? {}) as Record<string, unknown>;

	const grouped = useMemo(() => {
		if (!sectionsForVisibility.some((s) => s.visibilityRule)) {
			return groupFieldsBySection(fields, sections);
		}
		const visible = filterVisibleFields(fields, sectionsForVisibility, watched);
		const ids = getVisibleSectionIds(sectionsForVisibility, fieldsForValidation, watched);
		return groupFieldsBySection(visible, sections).filter((g) => ids.has(g.section.id));
	}, [fields, sections, sectionsForVisibility, fieldsForValidation, watched]);

	useEffect(() => {
		const allowed = new Set(
			filterVisibleFields(fieldsForValidation, sectionsForVisibility, watched).map((f) => f.key),
		);
		const hidden = fieldsForValidation.map((f) => f.key).filter((k) => !allowed.has(k));
		if (hidden.length > 0) form.clearErrors(hidden as never);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [grouped]);

	const mutation = trpc.updateMyAnswers.useMutation({
		onSuccess: async () => {
			await utils.getMyAnswers.invalidate();
			toast.success("Respostas atualizadas!");
		},
		onError: (e) => toast.error(e.message),
	});

	if (published.isPending || myAnswers.isPending) return <Skeleton className="h-40 w-full" />;
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
						onSubmit={form.handleSubmit((values) => {
							const visible = filterVisibleFields(
								fieldsForValidation,
								sectionsForVisibility,
								values as Record<string, unknown>,
							);
							const allowed = new Set(visible.map((f) => f.key));
							const stripped: Record<string, unknown> = {};
							for (const [k, v] of Object.entries((values ?? {}) as Record<string, unknown>)) {
								if (allowed.has(k)) stripped[k] = v;
							}
							mutation.mutate({ projectId, answers: stripped as Record<string, string | number | boolean | string[] | null> });
						})}
						className="flex flex-col gap-4"
					>
						{grouped.map((group) => (
						<div key={group.section.id} className="flex flex-col gap-4">
							<h4 className="text-sm font-bold">{group.section.title}</h4>
							{group.rows.map((row, ri) => (
								<div
									key={row.fields.map((f) => f.id).join("-") || `row-${ri}`}
									className={
										row.fields.length === 2
											? "grid w-full grid-cols-1 gap-4 md:grid-cols-2"
											: "w-full"
									}
								>
									{row.fields.map((f) => (
										<DynamicField key={f.id} field={f} control={form.control as never} name={f.key} />
									))}
								</div>
							))}
						</div>
					))}
						<Button type="submit" disabled={mutation.isPending}>
							{mutation.isPending ? "Salvando..." : "Salvar respostas"}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
