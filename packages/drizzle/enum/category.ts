import { pgEnum } from "drizzle-orm/pg-core";

export const activityCategories = [
	"lecture",
	"workshop",
	"round-table",
	"course",
	"seminar",
	"competition",
	"hackathon",
	"ceremony",
	"other",
] as const;
export const categoryEnum = pgEnum("category", activityCategories);

export const activityCategoryLabels = {
	lecture: "Palestra",
	workshop: "Oficina",
	"round-table": "Mesa redonda",
	course: "Curso",
	seminar: "Seminário",
	competition: "Competição",
	hackathon: "Hackathon",
	ceremony: "Cerimônia",
	other: "Outro",
} as const;
