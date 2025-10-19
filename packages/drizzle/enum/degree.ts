import { pgEnum } from "drizzle-orm/pg-core";

export const degreeLevels = [
	"highschool",   // Ensino médio
	"technical",    // Técnico
	"undergraduate", // Graduação
	"master",       // Mestrado
	"doctorate",    // Doutorado
	"postdoc",      // Pós-doutorado
	"other",        // Outro
] as const;

export const degreeLevelEnum = pgEnum("degree_level", degreeLevels);

export const degreeLevelLabels = {
	highschool: "Ensino médio",
	technical: "Técnico",
	undergraduate: "Graduação",
	master: "Mestrado",
	doctorate: "Doutorado",
	postdoc: "Pós-doutorado",
	other: "Outro",
} as const;