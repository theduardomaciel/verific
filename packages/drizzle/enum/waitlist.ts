import { pgEnum } from "drizzle-orm/pg-core";

// `waiting` e `offered` estão na fila; os demais são estados finais
export const waitlistStatuses = [
	"waiting",
	"offered",
	"enrolled",
	"left",
	"expired",
	"removed",
] as const;
export const waitlistStatusEnum = pgEnum("waitlist_status", waitlistStatuses);
export type WaitlistStatus = (typeof waitlistStatuses)[number];

export const waitlistEventTypes = [
	"joined",
	"left",
	"offered",
	"confirmed",
	"expired",
	"promoted",
	"removed",
] as const;
export const waitlistEventTypeEnum = pgEnum(
	"waitlist_event_type",
	waitlistEventTypes,
);
export type WaitlistEventType = (typeof waitlistEventTypes)[number];
