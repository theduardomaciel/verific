"use client";

import { Controller, type Control, type FieldValues } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, PhoneInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	FormControl,
	FormDescription,
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
import type { RouterOutput } from "@verific/api";

export type DynamicFormField = NonNullable<
	RouterOutput["getPublishedForm"]
>["fields"][number];

interface DynamicFieldProps {
	field: DynamicFormField;
	control: Control<FieldValues>;
	name: string;
	disabled?: boolean;
}

function requiredMark(required: boolean) {
	return required ? <span className="text-destructive ml-1">*</span> : null;
}

const EMPTY_SELECT_VALUE = "__verific_empty__";

export function DynamicField({
	field,
	control,
	name,
	disabled,
}: DynamicFieldProps) {
	const label = (
		<FormLabel>
			{field.label}
			{requiredMark(field.required)}
		</FormLabel>
	);

	return (
		<Controller
			control={control}
			name={name}
			render={({ field: rhf }) => {
				const value = rhf.value;
				switch (field.type) {
					case "textarea":
						return (
							<FormItem className="w-full">
								{label}
								{field.helpText && (
									<FormDescription>
										{field.helpText}
									</FormDescription>
								)}
								<FormControl>
									<Textarea
										className="resize-y"
										placeholder={field.helpText ?? ""}
										disabled={disabled}
										value={(value as string) ?? ""}
										onChange={(e) =>
											rhf.onChange(e.target.value)
										}
										onBlur={rhf.onBlur}
										name={rhf.name}
										ref={rhf.ref}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						);
					case "number":
						return (
							<FormItem className="w-full">
								{label}
								{field.helpText && (
									<FormDescription>
										{field.helpText}
									</FormDescription>
								)}
								<FormControl>
									<Input
										type="text"
										inputMode="decimal"
										autoComplete="off"
										disabled={disabled}
										value={(value as number | string) ?? ""}
										onChange={(e) => {
											// type="number" blocks "+", spaces and parens, so country
											// codes can't be typed. Accept them here and normalize
											// to a plain numeric string; z.coerce.number()
											// converts it back on validation/submit.
											const raw = e.target.value
												.replace(/,/g, ".")
												.replace(/[^0-9+.()\s-]/g, "")
												.replace(/[\s()-]/g, "");
											rhf.onChange(
												raw === "" ? undefined : raw,
											);
										}}
										onBlur={rhf.onBlur}
										name={rhf.name}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						);
					case "date":
						return (
							<FormItem className="w-full">
								{label}
								{field.helpText && (
									<FormDescription>
										{field.helpText}
									</FormDescription>
								)}
								<FormControl>
									<Input
										type="date"
										disabled={disabled}
										value={
											value instanceof Date
												? value
														.toISOString()
														.slice(0, 10)
												: ((value as string) ?? "")
										}
										onChange={(e) =>
											rhf.onChange(
												e.target.value || undefined,
											)
										}
										onBlur={rhf.onBlur}
										name={rhf.name}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						);
					case "select_single":
						return (
							<FormItem className="w-full">
								{label}
								{field.helpText && (
									<FormDescription>
										{field.helpText}
									</FormDescription>
								)}
								<Select
									disabled={disabled}
									value={(value as string) ?? ""}
									onValueChange={(v) =>
										rhf.onChange(
											!field.required &&
												v === EMPTY_SELECT_VALUE
												? undefined
												: v,
										)
									}
								>
									<FormControl>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Selecione uma opção" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{!field.required && (
											<SelectItem
												value={EMPTY_SELECT_VALUE}
												className="text-muted-foreground"
											>
												Limpar seleção
											</SelectItem>
										)}
										{(field.options ?? []).map((opt) => (
											<SelectItem key={opt} value={opt}>
												{opt}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						);
					case "select_multiple": {
						const selected: string[] = Array.isArray(value)
							? value
							: [];
						return (
							<FormItem className="w-full">
								{label}
								{field.helpText && (
									<FormDescription>
										{field.helpText}
									</FormDescription>
								)}
								<div className="flex flex-col gap-2">
									{(field.options ?? []).map((opt) => {
										const checked = selected.includes(opt);
										return (
											<label
												key={opt}
												className="flex cursor-pointer items-center gap-2 text-sm"
											>
												<Checkbox
													disabled={disabled}
													checked={checked}
													onCheckedChange={(c) => {
														if (c)
															rhf.onChange([
																...selected,
																opt,
															]);
														else
															rhf.onChange(
																selected.filter(
																	(v) =>
																		v !==
																		opt,
																),
															);
													}}
												/>
												{opt}
											</label>
										);
									})}
								</div>
								<FormMessage />
							</FormItem>
						);
					}
					case "checkbox":
						return (
							<FormItem className="flex flex-row items-start gap-3 space-y-0">
								<FormControl>
									<Checkbox
										disabled={disabled}
										checked={Boolean(value)}
										onCheckedChange={rhf.onChange}
									/>
								</FormControl>
								<div className="space-y-1 leading-none">
									<FormLabel>
										{field.label}
										{requiredMark(field.required)}
									</FormLabel>
									{field.helpText && (
										<FormDescription>
											{field.helpText}
										</FormDescription>
									)}
									<FormMessage />
								</div>
							</FormItem>
						);
					case "phone":
						return (
							<FormItem className="w-full">
								{label}
								{field.helpText && (
									<FormDescription>
										{field.helpText}
									</FormDescription>
								)}
								<FormControl>
									<PhoneInput
										name={rhf.name}
										disabled={disabled}
										value={(value as string) ?? ""}
										onChange={(v) =>
											rhf.onChange(
												v === "" ? undefined : v,
											)
										}
										onBlur={rhf.onBlur}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						);
					case "email":
						return (
							<FormItem className="w-full">
								{label}
								{field.helpText && (
									<FormDescription>
										{field.helpText}
									</FormDescription>
								)}
								<FormControl>
									<Input
										type="email"
										inputMode="email"
										autoComplete="email"
										placeholder="voce@exemplo.com"
										disabled={disabled}
										value={(value as string) ?? ""}
										maxLength={
											field.validation?.maxLength ??
											undefined
										}
										minLength={
											field.validation?.minLength ??
											undefined
										}
										onChange={(e) =>
											rhf.onChange(e.target.value)
										}
										onBlur={rhf.onBlur}
										name={rhf.name}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						);
					case "text":
					default:
						return (
							<FormItem className="w-full">
								{label}
								{field.helpText && (
									<FormDescription>
										{field.helpText}
									</FormDescription>
								)}
								<FormControl>
									<Input
										type="text"
										placeholder=""
										disabled={disabled}
										value={(value as string) ?? ""}
										maxLength={
											field.validation?.maxLength ??
											undefined
										}
										minLength={
											field.validation?.minLength ??
											undefined
										}
										onChange={(e) =>
											rhf.onChange(e.target.value)
										}
										onBlur={rhf.onBlur}
										name={rhf.name}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						);
				}
			}}
		/>
	);
}
