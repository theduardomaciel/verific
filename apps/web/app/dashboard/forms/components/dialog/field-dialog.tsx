"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
	PlusIcon,
	PencilIcon,
	BaselineIcon,
	TextInitialIcon,
	HashIcon,
	CalendarIcon,
	SquareMousePointerIcon,
	CopyCheckIcon,
	SquareCheckIcon,
	PhoneIcon,
	MailIcon,
} from "lucide-react";

import { trpc } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
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
import type { Field, Section } from "../../types";
import {
	buildRowHint,
	defaultFieldValues,
	fieldFormSchema,
	needsOptionsFor,
	toUpsertFieldInput,
	type FieldFormValues,
} from "../../lib/field-form";
import {
	formFieldTypeLabels,
	formFieldTypes,
} from "@verific/drizzle/enum/form-field-type";

interface FieldDialogProps {
	versionId: string;
	initial?: Field;
	onDone: () => void;
	/** Ordered fields of the version, for live row-pairing hints. */
	siblings?: Pick<Field, "id" | "label" | "halfWidth">[];
	/** Index of `initial` in `siblings`, or `siblings.length` for a new field at the end. */
	position?: number | null;
	sections?: Pick<Section, "id" | "title">[];
	defaultSectionId?: string | null;
}

type FieldType = (typeof formFieldTypes)[number];

const formFieldIcons: Record<FieldType, React.ReactNode> = {
	text: <BaselineIcon />,
	textarea: <TextInitialIcon />,
	number: <HashIcon />,
	date: <CalendarIcon />,
	select_single: <SquareMousePointerIcon />,
	select_multiple: <CopyCheckIcon />,
	checkbox: <SquareCheckIcon />,
	phone: <PhoneIcon />,
	email: <MailIcon />,
};

export function FieldDialog({
	versionId,
	initial,
	onDone,
	siblings,
	position,
	sections,
	defaultSectionId,
}: FieldDialogProps) {
	const [open, setOpen] = useState(false);
	const utils = trpc.useUtils();
	const mutation = trpc.upsertField.useMutation({
		onSuccess: async () => {
			await utils.getVersion.invalidate();
			await utils.listVersions.invalidate();
			await utils.getPublishedForm.invalidate();
			toast.success("Campo salvo!");
			setOpen(false);
			onDone();
		},
		onError: (e) => toast.error(e.message),
	});

	const form = useForm<FieldFormValues>({
		resolver: zodResolver(fieldFormSchema) as never,
		defaultValues: defaultFieldValues(initial, defaultSectionId),
	});

	const watchedType = form.watch("type");
	const watchedHalfWidth = form.watch("halfWidth");
	const needsOptions = needsOptionsFor(watchedType);
	const showNumberRange = watchedType === "number";
	const showTextLength =
		watchedType === "text" ||
		watchedType === "textarea" ||
		watchedType === "email";

	useEffect(() => {
		if (open) {
			form.reset(defaultFieldValues(initial, defaultSectionId));
		}
	}, [open, initial, defaultSectionId, form]);

	const rowHint = useMemo(
		() =>
			buildRowHint({
				siblings,
				position,
				initialId: initial?.id,
				halfWidth: watchedHalfWidth,
			}),
		[siblings, position, watchedHalfWidth, initial?.id],
	);

	function submit(values: FieldFormValues) {
		mutation.mutate(toUpsertFieldInput(versionId, values));
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" variant={initial ? "ghost" : "default"}>
					{initial ? <PencilIcon /> : <PlusIcon />}
					{initial ? "Editar" : "Novo campo"}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>
						{initial ? "Editar campo" : "Novo campo"}
					</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(submit)}
						className="flex flex-col gap-4"
					>
						<div className="flex w-full flex-row gap-3">
							<FormField
								control={form.control}
								name="label"
								render={({ field }) => (
									<FormItem className="flex-1">
										<FormLabel>Nome do Campo</FormLabel>
										<FormControl>
											<Input
												className="flex-1"
												placeholder="Ex: Restrições alimentares"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="type"
								render={({ field }) => (
									<FormItem className="flex-1">
										<FormLabel>Tipo</FormLabel>
										<Select
											value={field.value}
											onValueChange={(next) => {
												field.onChange(next);
												const currentLabel = form.getValues("label")?.trim();
												const prevLabel = formFieldTypeLabels[field.value as FieldType];
												if (!currentLabel || currentLabel === prevLabel) {
													form.setValue("label", formFieldTypeLabels[next as FieldType], {
														shouldValidate: true,
														shouldDirty: true,
													});
												}
											}}
										>
											<FormControl>
												<SelectTrigger className="w-auto flex-1">
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{formFieldTypes.map((type) => (
													<SelectItem
														key={type}
														value={type}
													>
														{formFieldIcons[type]}
														{
															formFieldTypeLabels[
																type
															]
														}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						{/* <FormField
							control={form.control}
							name="helpText"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Descrição de ajuda</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Texto de apoio ao participante"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/> */}
						{needsOptions && (
							<FormField
								control={form.control}
								name="optionsText"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Opções (uma por linha)
										</FormLabel>
										<FormControl>
											<Textarea
												placeholder={"Opção 1\nOpção 2"}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}
						{showNumberRange && (
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="min"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Valor mínimo</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="-"
													{...field}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="max"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Valor máximo</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="-"
													{...field}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
						)}
						{showTextLength && (
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="minLength"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Tamanho mínimo
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="-"
													{...field}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="maxLength"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Tamanho máximo
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="-"
													{...field}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
						)}
						{sections && sections.length > 0 && (
							<FormField
								control={form.control}
								name="sectionId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Seção</FormLabel>
										<Select
											value={field.value ?? ""}
											onValueChange={field.onChange}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Selecione a seção" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{sections.map((s) => (
													<SelectItem
														key={s.id}
														value={s.id}
													>
														{s.title}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<FormField
								control={form.control}
								name="required"
								render={({ field }) => (
									<FormItem className="flex items-center gap-2 space-y-0">
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
										<FormLabel>Obrigatório</FormLabel>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="isVisible"
								render={({ field }) => (
									<FormItem className="flex items-center gap-2 space-y-0">
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
										<Label>Visível</Label>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="editableAfterSignup"
								render={({ field }) => (
									<FormItem className="flex items-center gap-2 space-y-0">
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
										<Label>Editável após inscrição</Label>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="halfWidth"
								render={({ field }) => (
									<FormItem className="flex items-center gap-2 space-y-0">
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
										<Label>Meia largura</Label>
									</FormItem>
								)}
							/>
						</div>
						{rowHint && (
							<p className="text-muted-foreground text-xs">
								{rowHint}
							</p>
						)}
						<Button type="submit" disabled={mutation.isPending}>
							{mutation.isPending
								? "Salvando..."
								: "Salvar campo"}
						</Button>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
