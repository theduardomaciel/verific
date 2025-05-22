import { pgEnum } from "drizzle-orm/pg-core";

export const activityCategories = [
	"lecture",
	"workshop",
	"round-table",
	"course",
	"other",
] as const;
export const categoryEnum = pgEnum("category", activityCategories);

export const activityCategoryLabels = {
	lecture: "Palestra",
	workshop: "Oficina",
	"round-table": "Mesa redonda",
	course: "Curso",
	other: "Outro",
} as const;
