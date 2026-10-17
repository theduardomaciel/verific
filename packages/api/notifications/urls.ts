import "server-only";
import { appUrl } from "@verific/env";

/**
 * Single helper for absolute URLs in e-mails. The base URL comes from
 * NEXT_PUBLIC_APP_URL and must be present and absolute; otherwise it throws
 * loudly on first use (this is the bug class that produced the original
 * `accessUrl` render error — a template receiving a relative/empty URL).
 */
export function emailUrl(path: string): string {
	const base = typeof appUrl === "string" ? appUrl.trim() : "";
	if (!base || !/^https?:\/\//i.test(base)) {
		throw new Error(
			`[notifications] NEXT_PUBLIC_APP_URL is missing or not absolute ("${base}"). ` +
				"Email links cannot be built without it.",
		);
	}
	const normalized = path.startsWith("/") ? path : `/${path}`;
	return `${base.replace(/\/+$/, "")}${normalized}`;
}

/** Event hub page (`/{projectUrl}`). */
export function eventUrl(projectUrl: string): string {
	return emailUrl(`/${projectUrl}`);
}

/** Public schedule of an event (`/{projectUrl}/schedule`). */
export function eventScheduleUrl(projectUrl: string): string {
	return emailUrl(`/${projectUrl}/schedule`);
}

/** Owner view of a participant profile (`/{projectUrl}/profile/{shortId}?me=1`). */
export function profileUrl(projectUrl: string, shortId: string): string {
	return emailUrl(`/${projectUrl}/profile/${shortId}?me=1`);
}

/** Activity detail inside the participant schedule. */
export function activityUrl(projectUrl: string, activityId: string): string {
	return emailUrl(`/${projectUrl}/schedule/${activityId}`);
}

/** Organizer e-mails dashboard. */
export function adminEmailsUrl(): string {
	return emailUrl("/dashboard/emails");
}
