import { pgEnum } from "drizzle-orm/pg-core";

export const activityAudiences = ["internal", "external"] as const;
export const audienceEnum = pgEnum("type", activityAudiences);
