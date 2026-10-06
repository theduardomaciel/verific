import { pgEnum } from "drizzle-orm/pg-core";

export const formFieldTypes = [
	"text",
	"textarea",
	"number",
	"date",
	"select_single",
	"select_multiple",
	"radio_group",
	"checkbox",
	"phone",
	"email",
	"social_links",
] as const;

export const formFieldTypeEnum = pgEnum("form_field_type", formFieldTypes);

export type FormFieldType = (typeof formFieldTypes)[number];

export const formFieldTypeLabels: Record<FormFieldType, string> = {
	text: "Texto curto",
	textarea: "Texto longo",
	number: "Número",
	date: "Data",
	select_single: "Seleção única",
	select_multiple: "Múltipla seleção",
	radio_group: "Grupo de rádio",
	checkbox: "Checkbox",
	phone: "Telefone",
	email: "E-mail",
	social_links: "Links sociais",
};
