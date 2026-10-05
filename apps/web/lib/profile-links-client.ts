import type { ProfileLayout } from "@verific/drizzle/profile-layout";

export type LinkedSlot = "subtitle" | "bio" | "stats" | "socials" | "email";

/** Slot ao qual o campo está ligado (ou null). Client-safe. */
export function linkedSlotForField(
	layout: ProfileLayout | null | undefined,
	fieldId: string,
): LinkedSlot | null {
	if (!layout) return null;
	if (layout.subtitleFieldId === fieldId) return "subtitle";
	if (layout.bioFieldId === fieldId) return "bio";
	if (layout.socialsFieldId === fieldId) return "socials";
	if (layout.emailFieldId === fieldId) return "email";
	if (layout.stats.some((s) => s.fieldId === fieldId)) return "stats";
	return null;
}

export function isFieldLinked(
	layout: ProfileLayout | null | undefined,
	fieldId: string,
): boolean {
	return linkedSlotForField(layout, fieldId) !== null;
}
