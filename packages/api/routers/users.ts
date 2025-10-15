import { db } from "@verific/drizzle";

import { z } from "zod";

import { participant, user, project } from "@verific/drizzle/schema";
import { eq } from "@verific/drizzle/orm";

import { unstable_update } from "@verific/auth";

import { createTRPCRouter, protectedProcedure } from "../trpc";

// Enums
import { courses } from "@verific/drizzle/enum/course";
import { periods } from "@verific/drizzle/enum/period";

// API
import { TRPCError } from "@trpc/server";

// Google Sheets
import { google } from "googleapis";
import { env } from "@verific/env";

export const usersRouter = createTRPCRouter({
	updateUser: protectedProcedure
		.input(
			z.object({
				name: z.string(),
				course: z.enum(courses).optional(),
				registrationId: z.string().optional(),
				period: z.enum(periods).optional(),
				projectId: z.string(),
				reason: z.string().optional(),
				accessibility: z.string().optional(),
				discovery: z.enum(["instagram",
					"facebook",
					"twitter",
					"tiktok",
					"linkedin",
					"friends",
					"family",
					"event",
					"online_ad",
					"search_engine",
					"other"]).optional(),
				discoveryOther: z.string().optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const userId = ctx.session?.user.id;

			const { name, course, registrationId, period, projectId, reason, accessibility, discovery, discoveryOther } = input;

			if (!userId) {
				throw new Error("User not found.");
			}

			// First we update the user
			await db
				.update(user)
				.set({
					name,
				})
				.where(eq(user.id, userId));

			// Then we create the participant
			const createdMember = await db
				.insert(participant)
				.values({
					userId,
					course,
					registrationId,
					period,
					projectId,
				})
				.returning(/* {
					id: participant.id,
					role: participant.role,
				} */);

			// Fetch project to check research settings
			const projectData = await db.query.project.findFirst({
				where: eq(project.id, projectId),
				columns: {
					researchUrl: true,
					isResearchEnabled: true,
				},
			});

			// Submit research answers to Google Sheets if enabled
			if (projectData?.isResearchEnabled && projectData.researchUrl && (reason || accessibility || discovery)) {
				try {
					const auth = new google.auth.GoogleAuth({
						credentials: {
							client_email: env.NEXT_PUBLIC_GOOGLE_SHEET_CLIENT_EMAIL,
							private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
						},
						scopes: ['https://www.googleapis.com/auth/spreadsheets'],
					});

					/* const auth = new google.auth.GoogleAuth({
						scopes: ['https://www.googleapis.com/auth/spreadsheets'],
					});

					// Set environment variables for authentication
					process.env.GOOGLE_CLIENT_EMAIL = env.NEXT_PUBLIC_GOOGLE_SHEET_CLIENT_EMAIL;
					process.env.GOOGLE_PRIVATE_KEY = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'); */

					const sheets = google.sheets({ version: 'v4', auth });

					// Check if the sheet is empty and add headers if needed
					try {
						const response = await sheets.spreadsheets.values.get({
							spreadsheetId: projectData.researchUrl,
							range: 'A:A',
						});
						if (!response.data.values || response.data.values.length === 0) {
							const headers = ['Timestamp', 'Name', 'Email', 'Course', 'Registration ID', 'Period', 'Reason', 'Accessibility', 'Discovery', 'Discovery Other'];
							await sheets.spreadsheets.values.append({
								spreadsheetId: projectData.researchUrl,
								range: 'A:A',
								valueInputOption: 'RAW',
								requestBody: {
									values: [headers],
								},
							});
						}
					} catch (headerError) {
						console.error('Failed to check or add headers:', headerError);
						// Continue without headers if check fails
					}

					const values = [
						new Date().toISOString(),
						name,
						ctx.session.user.email,
						course,
						registrationId,
						period,
						reason || '',
						accessibility || '',
						discovery || '',
						discoveryOther || '',
					];

					await sheets.spreadsheets.values.append({
						spreadsheetId: projectData.researchUrl,
						range: 'A:A', // Append to first column, will auto-expand
						valueInputOption: 'RAW',
						requestBody: {
							values: [values],
						},
					});
				} catch (error) {
					console.error('Failed to submit research answers:', error);
					// Don't fail the mutation if sheets submission fails
				}
			}

			if (createdMember[0]) {
				await unstable_update({
					user: {
						...ctx.session.user,
						name,
					},
				});
			}
		}),
	getUser: protectedProcedure.query(async ({ ctx }) => {
		const { id } = ctx.session.user;

		if (!id) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not found.",
			});
		}

		const userData = await db.query.user.findFirst({
			where: (user, { eq }) => eq(user.id, id),
		});

		if (!userData) {
			throw new Error("User not found.");
		}

		return userData;
	}),
});
