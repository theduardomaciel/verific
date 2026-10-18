import "server-only";
import type {
	OfferExpiryScheduler,
	ScheduleOfferExpiryArgs,
	ScheduleOfferExpiryResult,
} from "./index";

/**
 * Development/test scheduler. Logs what would be published and does nothing.
 * Never fails.
 */
export function createConsoleScheduler(): OfferExpiryScheduler {
	return {
		async schedule(
			args: ScheduleOfferExpiryArgs,
		): Promise<ScheduleOfferExpiryResult> {
			console.log(
				`[scheduler:console] Would schedule offer expiry: enrollmentId=${args.enrollmentId}, activityId=${args.activityId}, offeredAt=${args.offeredAt}, expiresAt=${args.expiresAt}`,
			);
			return { messageId: `console-${Date.now()}-${args.enrollmentId}` };
		},
	};
}
