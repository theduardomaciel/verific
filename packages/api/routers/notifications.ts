import "server-only";
import { TRPCError } from "@trpc/server";

import {
	getEmailUsage,
	reprocessBatchNotifications,
	reprocessOneNotification,
} from "../notifications/service";
import { DrizzleNotificationStore } from "../notifications/store";
import {
	listNotificationsInput,
	notificationStatsInput,
	reprocessBatchNotificationsInput,
	reprocessOneNotificationInput,
} from "../schemas";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { requireProjectAccess } from "./forms";

/**
 * Organizer-only admin procedures for the notifications of one event.
 * Every procedure re-checks organizer/admin access for the event, scopes by
 * eventId, and never returns the `payload` column to the client.
 */
export const notificationsRouter = createTRPCRouter({
	listNotifications: protectedProcedure
		.input(listNotificationsInput)
		.query(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			const store = new DrizzleNotificationStore();
			return store.listPage({
				eventId: input.projectId,
				filter: input.filter,
				cursor: input.cursor ?? null,
				limit: input.limit,
			});
		}),

	statsNotifications: protectedProcedure
		.input(notificationStatsInput)
		.query(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			const store = new DrizzleNotificationStore();
			const [counts, usage] = await Promise.all([
				store.statusCounts(input.projectId),
				getEmailUsage(),
			]);
			return { counts, usage };
		}),

	reprocessOneNotification: protectedProcedure
		.input(reprocessOneNotificationInput)
		.mutation(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			const { notification } = await reprocessOneNotification({
				eventId: input.projectId,
				id: input.id,
			});
			if (!notification) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notificação não encontrada neste evento.",
				});
			}
			return { notification };
		}),

	reprocessBatchNotifications: protectedProcedure
		.input(reprocessBatchNotificationsInput)
		.mutation(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			return reprocessBatchNotifications({
				eventId: input.projectId,
				filter: input.filter,
				cursor: input.cursor ?? null,
				limit: input.limit,
			});
		}),
});
