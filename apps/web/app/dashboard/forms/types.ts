import type { RouterOutput } from "@verific/api";

export type Version = RouterOutput["listVersions"][number];
export type Field = RouterOutput["getVersion"]["fields"][number];

export type FormsTab = "builder" | "preview" | "answers";
