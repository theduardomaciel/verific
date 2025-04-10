import { pgEnum } from "drizzle-orm/pg-core";

export const periods = ["0", "1", "2", "3", "4", "5", "6", "7", "8"] as const;
export const periodEnum = pgEnum("period", periods);
export type Period = (typeof periods)[number];
