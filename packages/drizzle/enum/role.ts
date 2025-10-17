import { pgEnum } from "drizzle-orm/pg-core";

export const participantRoles = ["participant", "monitor"] as const;
export const roleEnum = pgEnum("role", participantRoles);
export type Role = (typeof participantRoles)[number];
