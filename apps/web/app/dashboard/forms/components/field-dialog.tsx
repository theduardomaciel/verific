"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon, PencilIcon } from "lucide-react";

import { trpc } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Field } from "../types";
import {
	buildRowHint,
	defaultFieldValues,
	fieldFormSchema,
	needsOptionsFor,
	toUpsertFieldInput,
	type FieldFormValues,
} from "../lib/field-form";

interface FieldDialogProps {
	versionId: string;
	initial?: Field;
	onDone: () => void;
	/** Ordered fields of the version, for live row-pairing hints. */
	siblings?: Pick<Field, "id" | "label" | "halfWidth">[];
	/** Index of `initial` in `siblings`, or `siblings.length` for a new field at the end. */
	position?: number | null;
}

export function FieldDialog({
	versionId,
	initial,
	onDone,
	siblings,
	position,
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
		defaultValues: defaultFieldValues(initial),
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
			form.reset(defaultFieldValues(initial));
		}
	}, [open, initial, form]);

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
						<FormField
							control={form.control}
							name="label"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Rótulo *</FormLabel>
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
								<FormItem>
									<FormLabel>Tipo *</FormLabel>
									<Select
										value={field.value}
										onValueChange={field.onChange}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="text">
												Texto curto
											</SelectItem>
											<SelectItem value="textarea">
												Texto longo
											</SelectItem>
											<SelectItem value="number">
												Número
											</SelectItem>
											<SelectItem value="date">
												Data
											</SelectItem>
											<SelectItem value="select_single">
												Seleção única
											</SelectItem>
											<SelectItem value="select_multiple">
												Múltipla seleção
											</SelectItem>
											<SelectItem value="checkbox">
												Checkbox
											</SelectItem>
											<SelectItem value="phone">
												Telefone
											</SelectItem>
											<SelectItem value="email">
												E-mail
											</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
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
						/>
						{needsOptions && (
							<FormField
								control={form.control}
								name="optionsText"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Opções (uma por linha) *
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
						<div className="flex flex-wrap gap-6">
							<FormField
								control={form.control}
								name="required"
								render={({ field }) => (
									<FormItem className="flex items-center gap-2 space-y-0">
										<FormControl>
											<Checkbox
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
