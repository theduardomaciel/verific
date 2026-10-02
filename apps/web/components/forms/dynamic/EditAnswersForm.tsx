"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/react";
import { buildAnswersSchema } from "@verific/api/schemas";
import { groupFieldsIntoRows } from "@/lib/forms/layout";
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

	const rows = useMemo(() => groupFieldsIntoRows(fields), [fields]);

	const schema = useMemo(
		() =>
			buildAnswersSchema(
				fields.map((f) => ({
					key: f.key,
					label: f.label,
					type: f.type,
					required: f.required,
					options: f.options,
					validation: f.validation,
					isVisible: f.isVisible,
					isActive: f.isActive,
				})),
			),
		[fields],
	);

	const defaultValues = useMemo(() => {
		const answers = (myAnswers.data?.answers ?? []) as Array<{ fieldId: string; value: unknown; field?: { key?: string } | null }>;
		const byKey: Record<string, unknown> = {};
		for (const a of answers) {
			const key = a.field?.key;
			if (key) byKey[key] = a.value;
		}
		// Normalize date values to yyyy-mm-dd for input[type=date]
		for (const f of fields) {
			const v = byKey[f.key];
			if (v instanceof Date) byKey[f.key] = (v as Date).toISOString().slice(0, 10);
		}
		return byKey;
	}, [myAnswers.data, fields]);

	const form = useForm<Record<string, unknown>>({
		resolver: zodResolver(schema as never),
		values: defaultValues,
	});

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
						onSubmit={form.handleSubmit((values) => mutation.mutate({ projectId, answers: values as Record<string, string | number | boolean | string[] | null> }))}
						className="flex flex-col gap-4"
					>
						{rows.map((row, ri) => (
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
						<Button type="submit" disabled={mutation.isPending}>
							{mutation.isPending ? "Salvando..." : "Salvar respostas"}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
