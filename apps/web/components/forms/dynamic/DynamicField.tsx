"use client";

import { useState } from "react";

import {
	type Control,
	type FieldPath,
	type FieldValues,
} from "react-hook-form";

import type { RouterOutput } from "@verific/api";
import {
	OTHER_LABEL,
	OTHER_PLACEHOLDER,
	OTHER_SENTINEL,
	OTHER_TEXT_MAX_LENGTH,
} from "@verific/api/schemas";
import { SOCIAL_SERVICES } from "@verific/drizzle/profile-layout";

import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import {
	FormControl,
	FormDescription,
	FormItem,
	FormLabel,
	FormMessage,
	FormField as RHFFormField,
} from "@/components/ui/form";
import { Input, PhoneInput } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { getFieldId } from "@/lib/forms/field-id";
import { cn } from "@/lib/utils";

import { SocialLinksEditor, type SocialEntry } from "./SocialLinksEditor";

export type DynamicFormField = NonNullable<
	RouterOutput["getPublishedForm"]
>["fields"][number];

interface DynamicFieldProps<TFieldValues extends FieldValues = FieldValues> {
	field: DynamicFormField;
	control: Control<TFieldValues>;
	name: string;
	disabled?: boolean;
}

function requiredMark(required: boolean) {
	return required ? (
		<span aria-hidden="true" className="text-destructive ml-1">
			*
		</span>
	) : null;
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
	idPrefix,
	options,
	allowOther,
	value,
	disabled,
	onChange,
}: {
	idPrefix: string;
	options: string[];
	allowOther: boolean;
	value: string[];
	disabled?: boolean;
	onChange: (next: string[]) => void;
}) {
	const others = value.filter((v) => !options.includes(v));
	const [otherOpen, setOtherOpen] = useState(others.length > 0);
	const othersKey = others.join("");
	const [prevOthersKey, setPrevOthersKey] = useState(othersKey);
	if (othersKey !== prevOthersKey) {
		setPrevOthersKey(othersKey);
		if (others.length > 0) setOtherOpen(true);
	}
	const otherText = others[0] ?? "";
	const otherId = `${idPrefix}-other`;
	const otherTextId = `${idPrefix}-other-text`;

	return (
		<div className="flex flex-col gap-2">
			{options.map((opt, index) => {
				const checked = value.includes(opt);
				const optionId = `${idPrefix}-option-${index}`;
				return (
					<div
						key={opt}
						className="flex cursor-pointer items-center gap-2 text-sm"
					>
						<Checkbox
							id={optionId}
							disabled={disabled}
							checked={checked}
							onCheckedChange={(c) => {
								if (c) onChange([...value, opt]);
								else onChange(value.filter((v) => v !== opt));
							}}
						/>
						<label htmlFor={optionId} className="cursor-pointer">
							{opt}
						</label>
					</div>
				);
			})}
			{allowOther && (
				<>
					<div className="flex cursor-pointer items-center gap-2 text-sm">
						<Checkbox
							id={otherId}
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
						<label htmlFor={otherId} className="cursor-pointer">
							{OTHER_LABEL}
						</label>
					</div>
					{otherOpen && (
						<Input
							id={otherTextId}
							aria-label={OTHER_LABEL}
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

export function DynamicField<TFieldValues extends FieldValues = FieldValues>({
	field,
	control,
	name,
	disabled,
}: DynamicFieldProps<TFieldValues>) {
	return (
		<RHFFormField
			control={control}
			name={name as FieldPath<TFieldValues>}
			render={({ field: rhf, fieldState }) => {
				// Identificadores estáveis derivados do `name` (e não do
				// `useId` interno do shadcn): o `FormControl`/`FormLabel`
				// repassam via `Slot`, então os ids explícitos aqui
				// vencem os aleatórios — `htmlFor`, `#âncora` e foco
				// passam a funcionar para todo tipo de campo.
				const controlId = getFieldId(name);
				const legendId = `${controlId}-legend`;
				const descriptionId = `${controlId}-description`;
				const messageId = `${controlId}-message`;
				const error = fieldState.error;

				const describedIds: string[] = [];
				if (field.helpText) describedIds.push(descriptionId);
				if (error) describedIds.push(messageId);
				const describedBy =
					describedIds.length > 0
						? describedIds.join(" ")
						: undefined;
				const required = field.required || undefined;

				const label = (
					<FormLabel htmlFor={controlId}>
						{field.label}
						{requiredMark(field.required)}
					</FormLabel>
				);

				// Controles agrupados (grupo de rádio, múltipla escolha,
				// links sociais): sem `htmlFor` único — o `span` nomeia o
				// grupo via `aria-labelledby` e o grupo carrega
				// `aria-required`/`aria-describedby`/`aria-invalid`.
				const groupLabel = (
					<span
						id={legendId}
						data-error={!!error}
						className={cn(
							"text-sm leading-none font-medium select-none data-[error=true]:text-destructive",
						)}
					>
						{field.label}
						{requiredMark(field.required)}
					</span>
				);

				const help = field.helpText ? (
					<FormDescription id={descriptionId}>
						{field.helpText}
					</FormDescription>
				) : null;

				const message = <FormMessage id={messageId} />;

				const value = rhf.value;
				switch (field.type) {
					case "textarea":
						return (
							<FormItem className="w-full scroll-mt-24">
								{label}
								{help}
								<FormControl
									id={controlId}
									aria-describedby={describedBy}
									aria-required={required}
								>
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
								{message}
							</FormItem>
						);
					case "number":
						return (
							<FormItem className="w-full scroll-mt-24">
								{label}
								{help}
								<FormControl
									id={controlId}
									aria-describedby={describedBy}
									aria-required={required}
								>
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
								{message}
							</FormItem>
						);
					case "date":
						return (
							<FormItem className="w-full scroll-mt-24">
								{label}
								{help}
								<FormControl
									id={controlId}
									aria-describedby={describedBy}
									aria-required={required}
								>
									<Input
										type="date"
										disabled={disabled}
										value={
											// `instanceof Date` exige `any`/`object` no LHS; com o
											// controle genérico o valor chega como tipo preciso,
											// então detecta Date por duck-typing sem casts.
											Object.prototype.toString.call(
												value,
											) === "[object Date]"
												? (value as unknown as Date)
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
								{message}
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
							<FormItem className="w-full scroll-mt-24">
								{label}
								{help}
								{useCombobox ? (
									<FormControl
										id={controlId}
										aria-describedby={describedBy}
										aria-required={required}
									>
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
										<FormControl
											id={controlId}
											aria-describedby={describedBy}
											aria-required={required}
										>
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
									<FormControl
										id={`${controlId}-other`}
										aria-label={OTHER_LABEL}
										aria-describedby={
											error ? messageId : undefined
										}
									>
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
								{message}
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
							<FormItem className="w-full scroll-mt-24">
								{groupLabel}
								{help}
								<FormControl
									id={controlId}
									aria-labelledby={legendId}
									aria-describedby={describedBy}
									aria-required={required}
								>
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
													id={getFieldId(
														`${name}-clear`,
													)}
												/>
												<label
													htmlFor={getFieldId(
														`${name}-clear`,
													)}
													className="text-muted-foreground cursor-pointer"
												>
													Limpar seleção
												</label>
											</div>
										)}
										{radioOptions.map((opt, index) => {
											const optionId = getFieldId(
												`${name}-option-${index}`,
											);
											return (
												<div
													key={opt}
													className="flex items-center gap-2 text-sm"
												>
													<RadioGroupItem
														value={opt}
														id={optionId}
													/>
													<label
														htmlFor={optionId}
														className="cursor-pointer"
													>
														{opt}
													</label>
												</div>
											);
										})}
										{radioAllowOther && (
											<div className="flex items-center gap-2 text-sm">
												<RadioGroupItem
													value={OTHER_SENTINEL}
													id={getFieldId(
														`${name}-other`,
													)}
												/>
												<label
													htmlFor={getFieldId(
														`${name}-other`,
													)}
													className="cursor-pointer"
												>
													{OTHER_LABEL}
												</label>
											</div>
										)}
									</RadioGroup>
								</FormControl>
								{radioOtherSelected && (
									<FormControl
										id={`${controlId}-other-text`}
										aria-label={OTHER_LABEL}
										aria-describedby={
											error ? messageId : undefined
										}
									>
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
								{message}
							</FormItem>
						);
					}
					case "select_multiple": {
						const selected: string[] = Array.isArray(value)
							? value
							: [];
						return (
							<FormItem className="w-full scroll-mt-24">
								{groupLabel}
								{help}
								<FormControl
									id={controlId}
									aria-labelledby={legendId}
									aria-describedby={describedBy}
									aria-required={required}
								>
									<div role="group">
										<SelectMultipleWithOther
											idPrefix={controlId}
											options={field.options ?? []}
											allowOther={getAllowOther(field)}
											value={selected}
											disabled={disabled}
											onChange={rhf.onChange}
										/>
									</div>
								</FormControl>
								{message}
							</FormItem>
						);
					}
					case "checkbox":
						return (
							<FormItem className="flex scroll-mt-24 flex-row items-start gap-3 space-y-0">
								<FormControl
									id={controlId}
									aria-describedby={describedBy}
									aria-required={required}
								>
									<Checkbox
										disabled={disabled}
										checked={Boolean(value)}
										onCheckedChange={rhf.onChange}
									/>
								</FormControl>
								<div className="space-y-1 leading-none">
									<FormLabel htmlFor={controlId}>
										{field.label}
										{requiredMark(field.required)}
									</FormLabel>
									{help}
									{message}
								</div>
							</FormItem>
						);
					case "phone":
						return (
							<FormItem className="w-full scroll-mt-24">
								{label}
								{help}
								<FormControl
									id={controlId}
									aria-describedby={describedBy}
									aria-required={required}
								>
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
								{message}
							</FormItem>
						);
					case "email":
						return (
							<FormItem className="w-full scroll-mt-24">
								{label}
								{help}
								<FormControl
									id={controlId}
									aria-describedby={describedBy}
									aria-required={required}
								>
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
								{message}
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
							<FormItem className="w-full scroll-mt-24">
								{groupLabel}
								{help}
								<FormControl
									id={controlId}
									aria-labelledby={legendId}
									aria-describedby={describedBy}
									aria-required={required}
								>
									<div role="group">
										<SocialLinksEditor
											services={services}
											value={entries}
											disabled={disabled}
											onChange={(next) =>
												rhf.onChange(next)
											}
										/>
									</div>
								</FormControl>
								{message}
							</FormItem>
						);
					}
					case "text":
					default:
						return (
							<FormItem className="w-full scroll-mt-24">
								{label}

								<FormControl
									id={controlId}
									aria-describedby={describedBy}
									aria-required={required}
								>
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
								{help}
								{message}
							</FormItem>
						);
				}
			}}
		/>
	);
}
