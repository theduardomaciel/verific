"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type Control } from "react-hook-form";
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
	ChevronDownIcon,
	CircleDotIcon,
} from "lucide-react";

import { trpc } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import type { Field } from "../../types";
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
	/** Section this dialog was opened from. New fields are created in it; edits stay in it. */
	sectionId?: string | null;
}

type FieldType = (typeof formFieldTypes)[number];

const formFieldIcons: Record<FieldType, React.ReactNode> = {
	text: <BaselineIcon />,
	textarea: <TextInitialIcon />,
	number: <HashIcon />,
	date: <CalendarIcon />,
	select_single: <SquareMousePointerIcon />,
	select_multiple: <CopyCheckIcon />,
	radio_group: <CircleDotIcon />,
	checkbox: <SquareCheckIcon />,
	phone: <PhoneIcon />,
	email: <MailIcon />,
};

type SwitchName =
	| "required"
	| "isVisible"
	| "editableAfterSignup"
	| "allowOther"
	| "halfWidth";

/** A setting row: label + short description on the left, switch on the right. */
function SwitchRow({
	control,
	name,
	label,
	description,
}: {
	control: Control<FieldFormValues>;
	name: SwitchName;
	label: string;
	description: string;
}) {
	return (
		<FormField
			control={control}
			name={name}
			render={({ field }) => (
				<FormItem className="flex flex-row items-center justify-between gap-4 space-y-0">
					<div className="flex flex-col gap-0.5">
						<FormLabel>{label}</FormLabel>
						<FormDescription className="text-xs">
							{description}
						</FormDescription>
					</div>
					<FormControl>
						<Switch
							checked={Boolean(field.value)}
							onCheckedChange={field.onChange}
						/>
					</FormControl>
				</FormItem>
			)}
		/>
	);
}

/** Bordered block used to group type-specific inputs. */
function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-lg border p-4">
			<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
				{title}
			</p>
			{children}
		</div>
	);
}

export function FieldDialog({
	versionId,
	initial,
	onDone,
	siblings,
	position,
	sectionId,
}: FieldDialogProps) {
	const [open, setOpen] = useState(false);
	const [advancedOpen, setAdvancedOpen] = useState(false);
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
		defaultValues: defaultFieldValues(initial, sectionId),
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
			form.reset(defaultFieldValues(initial, sectionId));
			setAdvancedOpen(false);
		}
	}, [open, initial, sectionId, form]);

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
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
				<DialogHeader>
					<DialogTitle>
						{initial ? "Editar campo" : "Novo campo"}
					</DialogTitle>
					<DialogDescription>
						Defina como este campo aparece no formulário de
						inscrição.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(submit)}
						className="flex flex-col gap-5"
					>
						{/* Essentials */}
						<div className="flex flex-col gap-4">
							<div className="flex w-full flex-row gap-3">
								<FormField
									control={form.control}
									name="label"
									render={({ field }) => (
										<FormItem className="flex-[3]">
											<FormLabel>Nome do campo</FormLabel>
											<FormControl>
												<Input
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
										<FormItem className="flex-[2]">
											<FormLabel>Tipo</FormLabel>
											<Select
												value={field.value}
												onValueChange={(next) => {
													field.onChange(next);
													const currentLabel = form
														.getValues("label")
														?.trim();
													const prevLabel =
														formFieldTypeLabels[
															field.value as FieldType
														];
													if (
														!currentLabel ||
														currentLabel ===
															prevLabel
													) {
														form.setValue(
															"label",
															formFieldTypeLabels[
																next as FieldType
															],
															{
																shouldValidate:
																	true,
																shouldDirty:
																	true,
															},
														);
													}
												}}
											>
												<FormControl>
													<SelectTrigger className="w-full">
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{formFieldTypes.map(
														(type) => (
															<SelectItem
																key={type}
																value={type}
															>
																{
																	formFieldIcons[
																		type
																	]
																}
																{
																	formFieldTypeLabels[
																		type
																	]
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
							</div>

							<FormField
								control={form.control}
								name="helpText"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Descrição de ajuda{" "}
											<span className="text-muted-foreground font-normal">
												(opcional)
											</span>
										</FormLabel>
										<FormControl>
											<Textarea
												rows={2}
												className="resize-none"
												placeholder="Texto de apoio exibido ao participante"
												{...field}
												value={field.value ?? ""}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{/* Type-specific: options */}
						{needsOptions && (
							<Section title="Opções">
								<FormField
									control={form.control}
									name="optionsText"
									render={({ field }) => (
										<FormItem>
											<FormControl>
												<Textarea
													rows={4}
													placeholder={
														"Opção 1\nOpção 2"
													}
													{...field}
												/>
											</FormControl>
											<FormDescription className="text-xs">
												Uma opção por linha.
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<SwitchRow
									control={form.control}
									name="allowOther"
									label="Permitir “Outro”"
									description="Adiciona a opção “Outro” por último, com campo de texto livre (máx. 200 caracteres)."
								/>
							</Section>
						)}

						{/* Type-specific: validation */}
						{showNumberRange && (
							<Section title="Validação">
								<div className="grid grid-cols-2 gap-3">
									<FormField
										control={form.control}
										name="min"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													Valor mínimo
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														placeholder="-"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="max"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													Valor máximo
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														placeholder="-"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</Section>
						)}
						{showTextLength && (
							<Section title="Validação">
								<div className="grid grid-cols-2 gap-3">
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
												<FormMessage />
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
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</Section>
						)}

						{/* Behavior */}
						<div className="flex flex-col gap-4">
							<SwitchRow
								control={form.control}
								name="required"
								label="Obrigatório"
								description="O participante precisa preencher para concluir a inscrição."
							/>
							<div className="flex flex-col gap-2">
								<SwitchRow
									control={form.control}
									name="halfWidth"
									label="Meia largura"
									description="Permite dividir a linha com outro campo de meia largura."
								/>
								{rowHint && (
									<p className="text-muted-foreground bg-muted/50 rounded-md px-3 py-2 text-xs">
										{rowHint}
									</p>
								)}
							</div>
						</div>

						{/* Advanced */}
						<Collapsible
							open={advancedOpen}
							onOpenChange={setAdvancedOpen}
							className="overflow-hidden rounded-lg border"
						>
							<CollapsibleTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									className="group flex w-full items-center justify-between rounded-none px-4"
								>
									<span className="text-sm font-medium">
										Configurações avançadas
									</span>
									<ChevronDownIcon className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<div className="flex flex-col gap-4 border-t px-4 py-4">
									<SwitchRow
										control={form.control}
										name="isVisible"
										label="Visível"
										description="Campos ocultos não aparecem no formulário."
									/>
									<SwitchRow
										control={form.control}
										name="editableAfterSignup"
										label="Editável após inscrição"
										description="O participante pode alterar a resposta depois de se inscrever."
									/>
								</div>
							</CollapsibleContent>
						</Collapsible>

						{/* Footer */}
						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setOpen(false)}
							>
								Cancelar
							</Button>
							<Button type="submit" disabled={mutation.isPending}>
								{mutation.isPending
									? "Salvando..."
									: "Salvar campo"}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
