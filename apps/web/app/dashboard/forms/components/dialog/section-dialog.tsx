"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@verific/zod";
import { PencilIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { isConditionalTriggerType } from "@verific/api/schemas";
import type { Field, Section } from "../../types";
import type { SectionMutation } from "../../hooks/use-forms-builder";

const sectionFormSchema = z
	.object({
		title: z.string().trim().min(1, "Obrigatório").max(120),
		useCondition: z.boolean().default(false),
		sourceFieldId: z.string().optional(),
		operator: z
			.enum([
				"is_checked",
				"is_not_checked",
				"equals",
				"includes_any",
				"includes_all",
			])
			.optional(),
		values: z.array(z.string()).default([]),
	})
	.superRefine((v, ctx) => {
		if (!v.useCondition) return;
		if (!v.sourceFieldId) {
			ctx.addIssue({
				code: "custom",
				path: ["sourceFieldId"],
				message: "Escolha o campo de origem.",
			});
		}
		if (!v.operator) {
			ctx.addIssue({
				code: "custom",
				path: ["operator"],
				message: "Escolha a condição.",
			});
		}
		if (
			v.operator === "equals" ||
			v.operator === "includes_any" ||
			v.operator === "includes_all"
		) {
			if (!v.values || v.values.length === 0) {
				ctx.addIssue({
					code: "custom",
					path: ["values"],
					message: "Escolha ao menos um valor.",
				});
			}
		}
	});

type SectionFormValues = z.infer<typeof sectionFormSchema>;

interface SectionDialogProps {
	versionId: string;
	initial?: Section;
	fields?: Pick<Field, "id" | "label" | "type" | "options" | "sectionId">[];
	sections?: Pick<Section, "id" | "order" | "title">[];
	upsertSection: SectionMutation;
}

function defaultOperatorFor(type: string): SectionFormValues["operator"] {
	if (type === "checkbox") return "is_checked";
	if (type === "select_multiple") return "includes_any";
	return "equals";
}

export function SectionDialog({
	versionId,
	initial,
	fields = [],
	sections = [],
	upsertSection,
}: SectionDialogProps) {
	const [open, setOpen] = useState(false);
	const form = useForm<SectionFormValues>({
		resolver: zodResolver(sectionFormSchema) as never,
		defaultValues: {
			title: initial?.title ?? "",
			useCondition: Boolean(
				(initial as { visibilityRule?: unknown } | undefined)
					?.visibilityRule,
			),
			sourceFieldId:
				(
					initial as
						| { visibilityRule?: { sourceFieldId?: string } | null }
						| undefined
				)?.visibilityRule?.sourceFieldId ?? undefined,
			operator:
				(
					initial as
						| {
								visibilityRule?: {
									operator?: SectionFormValues["operator"];
								} | null;
						  }
						| undefined
				)?.visibilityRule?.operator ?? undefined,
			values:
				(
					initial as
						| { visibilityRule?: { values?: string[] } | null }
						| undefined
				)?.visibilityRule?.values ?? [],
		},
	});

	useEffect(() => {
		if (open) {
			const rule = (
				initial as
					| {
							visibilityRule?: {
								sourceFieldId?: string;
								operator?: SectionFormValues["operator"];
								values?: string[];
							} | null;
					  }
					| undefined
			)?.visibilityRule;
			form.reset({
				title: initial?.title ?? "",
				useCondition: Boolean(rule),
				sourceFieldId: rule?.sourceFieldId,
				operator: rule?.operator,
				values: rule?.values ?? [],
			});
		}
	}, [open, initial, form]);

	// oxlint-disable-line react-hooks/exhaustive-deps -- watchedUseCondition/form/sourceField are stable refs; adding them would trigger on every keystroke, causing form resets mid-edit.
	const eligibleFields = useMemo(
		() =>
			fields.filter((f) => {
				if (!isConditionalTriggerType(f.type)) return false;
				if (initial && f.sectionId === initial.id) return false;
				if (
					f.type !== "checkbox" &&
					(!f.options || f.options.length === 0)
				)
					return false;
				return true;
			}),
		[fields, initial],
	);

	const watchedSourceId = useWatch({
		control: form.control,
		name: "sourceFieldId",
	});
	const watchedUseCondition = useWatch({
		control: form.control,
		name: "useCondition",
	});
	const sourceField = eligibleFields.find((f) => f.id === watchedSourceId);
	const watchedOperator = useWatch({
		control: form.control,
		name: "operator",
	});

	// oxlint-disable-line react-hooks/exhaustive-deps -- watchedUseCondition/form/sourceField are stable refs; adding them would trigger on every keystroke, causing form resets mid-edit.
	// oxlint-disable-line react-hooks/exhaustive-deps -- watchedUseCondition/form/sourceField are stable refs; adding them would trigger on every keystroke, causing form resets mid-edit.
	useEffect(() => {
		if (sourceField && watchedUseCondition) {
			// oxlint-disable-line react-hooks/exhaustive-deps -- watchedUseCondition/form/sourceField are stable refs; adding them would trigger on every keystroke, causing form resets mid-edit.
			form.setValue("operator", defaultOperatorFor(sourceField.type), {
				shouldValidate: true,
			});
			form.setValue("values", [], { shouldValidate: true });
		}
	}, [watchedSourceId]);

	const orderWarning = useMemo(() => {
		if (!initial || !sourceField) return null;
		const targetOrder = sections.find((s) => s.id === initial.id)?.order;
		const sourceSection = sections.find(
			(s) => s.id === sourceField.sectionId,
		);
		if (targetOrder === undefined || !sourceSection) return null;
		if (sourceSection.order >= targetOrder) {
			return "O campo de origem está na mesma seção ou em uma seção posterior. Prefira campos de seções anteriores para uma boa experiência.";
		}
		return null;
	}, [initial, sourceField, sections]);

	function submit(values: SectionFormValues) {
		upsertSection.mutate(
			{
				versionId,
				...(initial ? { sectionId: initial.id } : {}),
				title: values.title,
				visibilityRule: values.useCondition
					? {
							sourceFieldId: values.sourceFieldId!,
							operator: values.operator!,
							values:
								values.operator === "is_checked" ||
								values.operator === "is_not_checked"
									? undefined
									: values.values,
						}
					: null,
			},
			{ onSuccess: () => setOpen(false) },
		);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" variant={initial ? "ghost" : "outline"}>
					{initial ? <PencilIcon /> : <PlusIcon />}
					{initial ? "Editar seção" : "Nova seção"}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
				<DialogHeader>
					<DialogTitle>
						{initial ? "Editar seção" : "Nova seção"}
					</DialogTitle>
					<DialogDescription>
						Defina o título e, se quiser, uma condição para exibir
						esta seção.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={(e) => void form.handleSubmit(submit)(e)}
						className="flex flex-col gap-4"
					>
						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Título da seção</FormLabel>
									<FormControl>
										<Input
											placeholder="Ex: Dados pessoais"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="useCondition"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-3">
									<div className="flex flex-col gap-0.5">
										<FormLabel>
											Exibição condicional
										</FormLabel>
										<FormDescription className="text-xs">
											Mostrar esta seção apenas quando uma
											resposta anterior atender à
											condição.
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
						{watchedUseCondition && (
							<div className="flex flex-col gap-4 rounded-lg border p-4">
								{eligibleFields.length === 0 ? (
									<p className="text-muted-foreground text-sm">
										Nenhum campo elegível ainda. Crie um
										campo do tipo checkbox, seleção única,
										múltipla seleção ou grupo de rádio em
										outra seção.
									</p>
								) : (
									<>
										<FormField
											control={form.control}
											name="sourceFieldId"
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														Quando o campo
													</FormLabel>
													<Select
														value={
															field.value ?? ""
														}
														onValueChange={
															field.onChange
														}
													>
														<FormControl>
															<SelectTrigger className="w-full">
																<SelectValue placeholder="Escolha o campo de origem" />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{eligibleFields.map(
																(f) => (
																	<SelectItem
																		key={
																			f.id
																		}
																		value={
																			f.id
																		}
																	>
																		{
																			f.label
																		}
																	</SelectItem>
																),
															)}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>
										{sourceField?.type === "checkbox" && (
											<FormField
												control={form.control}
												name="operator"
												render={({ field }) => (
													<FormItem>
														<FormLabel>
															estiver
														</FormLabel>
														<Select
															value={
																field.value ??
																""
															}
															onValueChange={
																field.onChange
															}
														>
															<FormControl>
																<SelectTrigger className="w-full">
																	<SelectValue />
																</SelectTrigger>
															</FormControl>
															<SelectContent>
																<SelectItem value="is_checked">
																	Marcado
																</SelectItem>
																<SelectItem value="is_not_checked">
																	Desmarcado
																</SelectItem>
															</SelectContent>
														</Select>
														<FormMessage />
													</FormItem>
												)}
											/>
										)}
										{(sourceField?.type ===
											"select_single" ||
											sourceField?.type ===
												"radio_group") && (
											<FormField
												control={form.control}
												name="operator"
												render={({ field }) => (
													<FormItem>
														<FormLabel>
															for
														</FormLabel>
														<Select
															value={
																field.value ??
																""
															}
															onValueChange={
																field.onChange
															}
														>
															<FormControl>
																<SelectTrigger className="w-full">
																	<SelectValue />
																</SelectTrigger>
															</FormControl>
															<SelectContent>
																<SelectItem value="equals">
																	Igual a
																	(qualquer um
																	dos valores)
																</SelectItem>
															</SelectContent>
														</Select>
														<FormMessage />
													</FormItem>
												)}
											/>
										)}
										{sourceField?.type ===
											"select_multiple" && (
											<FormField
												control={form.control}
												name="operator"
												render={({ field }) => (
													<FormItem>
														<FormLabel>
															condição
														</FormLabel>
														<Select
															value={
																field.value ??
																""
															}
															onValueChange={
																field.onChange
															}
														>
															<FormControl>
																<SelectTrigger className="w-full">
																	<SelectValue />
																</SelectTrigger>
															</FormControl>
															<SelectContent>
																<SelectItem value="includes_any">
																	Contiver
																	qualquer um
																</SelectItem>
																<SelectItem value="includes_all">
																	Contiver
																	todos
																</SelectItem>
															</SelectContent>
														</Select>
														<FormMessage />
													</FormItem>
												)}
											/>
										)}
										{sourceField &&
											watchedOperator !== "is_checked" &&
											watchedOperator !==
												"is_not_checked" && (
												<FormField
													control={form.control}
													name="values"
													render={({ field }) => (
														<FormItem>
															<FormLabel>
																Valores que
																exibem a seção
															</FormLabel>
															<div className="flex flex-wrap gap-2">
																{(
																	sourceField.options ??
																	[]
																).map((opt) => {
																	const checked =
																		(
																			field.value ??
																			[]
																		).includes(
																			opt,
																		);
																	return (
																		<Badge
																			key={
																				opt
																			}
																			variant={
																				checked
																					? "default"
																					: "outline"
																			}
																			className="cursor-pointer"
																			onClick={() => {
																				const next =
																					checked
																						? (
																								field.value ??
																								[]
																							).filter(
																								(
																									v: string,
																								) =>
																									v !==
																									opt,
																							)
																						: [
																								...(field.value ??
																									[]),
																								opt,
																							];
																				field.onChange(
																					next,
																				);
																			}}
																		>
																			<span className="flex items-center gap-1">
																				<Checkbox
																					checked={
																						checked
																					}
																					className="pointer-events-none h-3 w-3"
																				/>
																				{
																					opt
																				}
																			</span>
																		</Badge>
																	);
																})}
															</div>
															<FormMessage />
														</FormItem>
													)}
												/>
											)}
										{orderWarning && (
											<p className="bg-muted/50 text-muted-foreground rounded-md px-3 py-2 text-xs">
												{orderWarning}
											</p>
										)}
									</>
								)}
							</div>
						)}
						<Button
							type="submit"
							disabled={upsertSection.isPending}
						>
							{upsertSection.isPending
								? "Salvando..."
								: "Salvar seção"}
						</Button>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
