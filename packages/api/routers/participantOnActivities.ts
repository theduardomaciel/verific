import { z } from "zod";

import { db } from "@verific/drizzle";
import {
	activity,
	participant,
	participantOnActivity,
	project,
	user,
} from "@verific/drizzle/schema";
import { and, eq, getTableColumns } from "@verific/drizzle/orm";

// tRPC
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const participantOnActivitiesRouter = createTRPCRouter({
	getActivitiesFromParticipant: publicProcedure
		.input(
			z.object({
				projectUrl: z.string(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const { projectUrl } = input;
			const userId = ctx.session?.user.id;

			if (!userId) {
				return {
					isParticipant: false,
					activities: [],
					role: null,
				};
			}

			// Busca o projeto e o participante em uma única consulta
			const projectWithParticipant = await db
				.select({
					projectId: project.id,
					participantId: participant.id,
					role: participant.role,
				})
				.from(project)
				.leftJoin(participant, eq(participant.projectId, project.id))
				.where(
					and(
						eq(project.url, projectUrl),
						eq(participant.userId, userId),
					),
				);

			const projectRow = projectWithParticipant[0];
			const participantId = projectRow?.participantId;

			if (!!participantId) {
				/* const activities = await db
					.select({
						...getTableColumns(participantOnActivity),
						activity: {
							...getTableColumns(activity),
						},
					})
					.from(participantOnActivity)
					.innerJoin(
						activity,
						eq(activity.id, participantOnActivity.activityId),
					)
					.where(
						eq(participantOnActivity.participantId, participantId),
					); */
				const activities =
					await db.query.participantOnActivity.findMany({
						where: (participantOnActivity, { eq }) =>
							eq(
								participantOnActivity.participantId,
								participantId,
							),
						with: {
							activity: {
								with: {
									speaker: true,
									participantsOnActivity: true,
								},
							},
						},
					});

				return {
					isParticipant: true,
					activities,
					role: projectRow.role,
					participantId: participantId,
				};
			}

			// Se o participante não estiver inscrito, retorna um objeto vazio
			return {
				isParticipant: false,
				activities: [],
				role: null,
			};
		}),
});
