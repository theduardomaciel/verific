import { pgEnum } from "drizzle-orm/pg-core";

export const participantRoles = ["participant", "moderator"] as const;
export const roleEnum = pgEnum("role", participantRoles);
export type Role = (typeof participantRoles)[number];
