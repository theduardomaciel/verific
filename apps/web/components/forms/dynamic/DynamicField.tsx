"use client";

import { type Control, type FieldValues } from "react-hook-form";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, PhoneInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	FormControl,
	FormDescription,
	FormItem,
	FormLabel,
	FormMessage,
	FormField as RHFFormField,
} from "@/components/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Combobox } from "@/components/ui/combobox";
import type { RouterOutput } from "@verific/api";
import {
	OTHER_LABEL,
	OTHER_PLACEHOLDER,
	OTHER_SENTINEL,
	OTHER_TEXT_MAX_LENGTH,
} from "@verific/api/schemas";
import { SOCIAL_SERVICES } from "@verific/drizzle/profile-layout";
import { SocialLinksEditor, type SocialEntry } from "./SocialLinksEditor";

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

function getAllowOther(field: DynamicFormField): boolean {
	return (field as { allowOther?: boolean | null }).allowOther === true;
}

/**
 * Checkbox list for `select_multiple` with an opt-in "Outro" entry rendered
 * last. The custom text is stored as-is as a single array element: any stored
 * value that isn't in `options` is treated as an "Other" answer (which also
 * gracefully handles options deleted/renamed after answering).
 */
function SelectMultipleWithOther({
	options,
	allowOther,
	value,
	disabled,
	onChange,
}: {
	options: string[];
	allowOther: boolean;
	value: string[];
	disabled?: boolean;
	onChange: (next: string[]) => void;
}) {
	const others = value.filter((v) => !options.includes(v));
	const [otherOpen, setOtherOpen] = useState(others.length > 0);
	const othersKey = others.join("");
	useEffect(() => {
		if (others.length > 0) setOtherOpen(true);
	}, [othersKey]);
	const otherText = others[0] ?? "";

	return (
		<div className="flex flex-col gap-2">
			{options.map((opt) => {
				const checked = value.includes(opt);
				return (
					<label
						key={opt}
						className="flex cursor-pointer items-center gap-2 text-sm"
					>
						<Checkbox
							disabled={disabled}
							checked={checked}
							onCheckedChange={(c) => {
								if (c) onChange([...value, opt]);
								else onChange(value.filter((v) => v !== opt));
							}}
						/>
						{opt}
					</label>
				);
			})}
			{allowOther && (
				<>
					<label className="flex cursor-pointer items-center gap-2 text-sm">
						<Checkbox
							disabled={disabled}
							checked={otherOpen}
							onCheckedChange={(c) => {
								if (c) {
									setOtherOpen(true);
								} else {
									setOtherOpen(false);
									onChange(
										value.filter((v) =>
											options.includes(v),
										),
									);
								}
							}}
						/>
						{OTHER_LABEL}
					</label>
					{otherOpen && (
						<Input
							type="text"
							placeholder={OTHER_PLACEHOLDER}
							disabled={disabled}
							maxLength={OTHER_TEXT_MAX_LENGTH}
							value={otherText}
							onChange={(e) => {
								const text = e.target.value;
								const kept = value.filter((v) =>
									options.includes(v),
								);
								onChange(text === "" ? kept : [...kept, text]);
							}}
						/>
					)}
				</>
			)}
		</div>
	);
}

const EMPTY_SELECT_VALUE = "__verific_empty__";

/**
 * Above this number of options, `select_single` renders a searchable
 * combobox instead of a plain select so long lists remain usable.
 */
const COMBOBOX_THRESHOLD = 10;

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
		<RHFFormField
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
					case "select_single": {
						const singleOptions = field.options ?? [];
						const singleAllowOther = getAllowOther(field);
						const singleRaw = (value ?? undefined) as
							| string
							| undefined;
						const singleInOptions =
							typeof singleRaw === "string" &&
							singleRaw !== "" &&
							singleOptions.includes(singleRaw);
						// Stored custom text as-is: anything not in `options`
						// (including "" right after picking "Outro") is an
						// "Other" answer, so edits pre-select it automatically.
						const singleOtherSelected =
							singleAllowOther &&
							typeof singleRaw === "string" &&
							(singleRaw === "" ||
								(singleRaw !== "" &&
									!singleOptions.includes(singleRaw)));
						const singleSelectValue = singleInOptions
							? singleRaw
							: singleOtherSelected
								? OTHER_SENTINEL
								: "";
						const singleOtherText =
							singleOtherSelected &&
							typeof singleRaw === "string" &&
							singleRaw !== "" &&
							!singleOptions.includes(singleRaw)
								? singleRaw
								: "";
						const handleSingleChange = (v?: string) => {
							if (v === OTHER_SENTINEL) {
								// Keep already-typed custom text when re-picking.
								rhf.onChange(
									typeof singleRaw === "string" &&
										singleRaw !== "" &&
										!singleOptions.includes(singleRaw)
										? singleRaw
										: "",
								);
							} else {
								rhf.onChange(
									!field.required &&
										(v === EMPTY_SELECT_VALUE ||
											v === undefined ||
											v === "")
										? undefined
										: v,
								);
							}
						};
						// Long lists get a searchable combobox instead of a
						// plain select.
						const useCombobox =
							singleOptions.length > COMBOBOX_THRESHOLD;
						const singleComboItems = [
							...(!field.required
								? [
										{
											label: "Limpar seleção",
											value: EMPTY_SELECT_VALUE,
										},
									]
								: []),
							...singleOptions.map((opt) => ({
								label: opt,
								value: opt,
							})),
							...(singleAllowOther
								? [
										{
											label: OTHER_LABEL,
											value: OTHER_SENTINEL,
										},
									]
								: []),
						];
						return (
							<FormItem className="w-full">
								{label}
								{field.helpText && (
									<FormDescription>
										{field.helpText}
									</FormDescription>
								)}
								{useCombobox ? (
									<FormControl>
										<Combobox
											value={singleSelectValue}
											onChange={handleSingleChange}
											onBlur={rhf.onBlur}
											disabled={disabled}
											placeholder="Selecione uma opção"
											searchMessage="Pesquisar..."
											emptyMessage="Nenhuma opção encontrada."
											items={singleComboItems}
										/>
									</FormControl>
								) : (
									<Select
										disabled={disabled}
										value={singleSelectValue}
										onValueChange={handleSingleChange}
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
											{(field.options ?? []).map(
												(opt) => (
													<SelectItem
														key={opt}
														value={opt}
													>
														{opt}
													</SelectItem>
												),
											)}
											{singleAllowOther && (
												<SelectItem
													value={OTHER_SENTINEL}
												>
													{OTHER_LABEL}
												</SelectItem>
											)}
										</SelectContent>
									</Select>
								)}
								{singleOtherSelected && (
									<FormControl>
										<Input
											type="text"
											placeholder={OTHER_PLACEHOLDER}
											disabled={disabled}
											maxLength={OTHER_TEXT_MAX_LENGTH}
											value={singleOtherText}
											onChange={(e) =>
												rhf.onChange(e.target.value)
											}
											onBlur={rhf.onBlur}
											name={rhf.name}
										/>
									</FormControl>
								)}
								<FormMessage />
							</FormItem>
						);
					}
					case "radio_group": {
						const radioOptions = field.options ?? [];
						const radioAllowOther = getAllowOther(field);
						const radioRaw = (value ?? undefined) as
							| string
							| undefined;
						const radioInOptions =
							typeof radioRaw === "string" &&
							radioOptions.includes(radioRaw);
						const radioOtherSelected =
							radioAllowOther &&
							typeof radioRaw === "string" &&
							(radioRaw === "" ||
								(radioRaw !== "" &&
									!radioOptions.includes(radioRaw)));
						const radioValue = radioInOptions
							? radioRaw
							: radioOtherSelected
								? OTHER_SENTINEL
								: "";
						const radioOtherText =
							radioOtherSelected &&
							typeof radioRaw === "string" &&
							radioRaw !== "" &&
							!radioOptions.includes(radioRaw)
								? radioRaw
								: "";
						return (
							<FormItem className="w-full">
								{label}
								{field.helpText && (
									<FormDescription>
										{field.helpText}
									</FormDescription>
								)}
								<FormControl>
									<RadioGroup
										disabled={disabled}
										value={radioValue}
										onValueChange={(v) => {
											if (v === OTHER_SENTINEL) {
												rhf.onChange(
													typeof radioRaw ===
														"string" &&
														radioRaw !== "" &&
														!radioOptions.includes(
															radioRaw,
														)
														? radioRaw
														: "",
												);
											} else if (
												!field.required &&
												v === EMPTY_SELECT_VALUE
											) {
												rhf.onChange(undefined);
											} else {
												rhf.onChange(v);
											}
										}}
										className="flex flex-col gap-2"
									>
										{!field.required && (
											<div className="flex items-center gap-2 text-sm">
												<RadioGroupItem
													value={EMPTY_SELECT_VALUE}
													id={`${name}-clear`}
												/>
												<label
													htmlFor={`${name}-clear`}
													className="text-muted-foreground cursor-pointer"
												>
													Limpar seleção
												</label>
											</div>
										)}
										{radioOptions.map((opt) => (
											<div
												key={opt}
												className="flex items-center gap-2 text-sm"
											>
												<RadioGroupItem
													value={opt}
													id={`${name}-${opt}`}
												/>
												<label
													htmlFor={`${name}-${opt}`}
													className="cursor-pointer"
												>
													{opt}
												</label>
											</div>
										))}
										{radioAllowOther && (
											<div className="flex items-center gap-2 text-sm">
												<RadioGroupItem
													value={OTHER_SENTINEL}
													id={`${name}-other`}
												/>
												<label
													htmlFor={`${name}-other`}
													className="cursor-pointer"
												>
													{OTHER_LABEL}
												</label>
											</div>
										)}
									</RadioGroup>
								</FormControl>
								{radioOtherSelected && (
									<FormControl>
										<Input
											type="text"
											placeholder={OTHER_PLACEHOLDER}
											disabled={disabled}
											maxLength={OTHER_TEXT_MAX_LENGTH}
											value={radioOtherText}
											onChange={(e) =>
												rhf.onChange(e.target.value)
											}
											onBlur={rhf.onBlur}
											name={rhf.name}
										/>
									</FormControl>
								)}
								<FormMessage />
							</FormItem>
						);
					}
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
								<SelectMultipleWithOther
									options={field.options ?? []}
									allowOther={getAllowOther(field)}
									value={selected}
									disabled={disabled}
									onChange={rhf.onChange}
								/>
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
					case "social_links": {
						const configured = field.options ?? [];
						const allowed =
							configured.length > 0
								? SOCIAL_SERVICES.filter((s) =>
										configured.includes(s.id),
									)
								: [...SOCIAL_SERVICES];
						const services =
							allowed.length > 0 ? allowed : [...SOCIAL_SERVICES];
						const entries = (
							Array.isArray(value) ? value : []
						) as SocialEntry[];
						return (
							<FormItem className="w-full">
								{label}
								{field.helpText && (
									<FormDescription>
										{field.helpText}
									</FormDescription>
								)}
								<FormControl>
									<SocialLinksEditor
										services={services}
										value={entries}
										disabled={disabled}
										onChange={(next) => rhf.onChange(next)}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						);
					}
					case "text":
					default:
						return (
							<FormItem className="w-full">
								{label}

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
								{field.helpText && (
									<FormDescription>
										{field.helpText}
									</FormDescription>
								)}
								<FormMessage />
							</FormItem>
						);
				}
			}}
		/>
	);
}
