import { z } from "zod";

import {
	type JoinFormSection0Schema,
	joinFormSection0Schema,
} from "@/lib/validations/forms/join-form/section0";

import {
	type JoinFormSection1Schema,
	joinFormSection1Schema,
} from "@/lib/validations/forms/join-form/section1";

import {
	type JoinFormSection2Schema,
	joinFormSection2Schema,
} from "@/lib/validations/forms/join-form/section2";

export enum JoinFormTypeEnum {
	Section0 = "section0",
	Section1 = "section1",
	Section2 = "section2",
}

export const joinFormSchema = z.discriminatedUnion("formType", [
	z.object({
		formType: z.literal(JoinFormTypeEnum.Section0),
		section0: joinFormSection0Schema,
	}),
	z.object({
		formType: z.literal(JoinFormTypeEnum.Section1),
		section1: joinFormSection1Schema,
	}),
	z.object({
		formType: z.literal(JoinFormTypeEnum.Section2),
		section2: joinFormSection2Schema,
	}),
]);

export type JoinFormSchema = {
	formType: JoinFormTypeEnum;
	section0: JoinFormSection0Schema;
	section1: JoinFormSection1Schema;
	section2: JoinFormSection2Schema;
};
