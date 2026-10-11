import { TRPCError } from "@trpc/server";

import { db } from "@verific/drizzle";
import { and, eq, ilike, isNull, ne } from "@verific/drizzle/orm";
import {
	socialEntrySchema,
	type SocialLinks,
} from "@verific/drizzle/profile-layout";
import { participant, project, speaker, user } from "@verific/drizzle/schema";
import { z } from "@verific/zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

async function requireProjectAccess(projectId: string, userId: string) {
	const data = await db.query.project.findFirst({
		where: eq(project.id, projectId),
		with: { moderators: { columns: { userId: true } } },
	});
	if (!data) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Evento não encontrado.",
		});
	}
	const allowed =
		data.ownerId === userId ||
		data.moderators.some((m) => m.userId === userId);
	if (!allowed) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Sem permissão neste evento.",
		});
	}
	return data;
}

/** Normalizes organizer-typed email to lowercase, or null when empty. */
export function normalizeSpeakerEmail(
	raw: string | null | undefined,
): string | null {
	if (raw === undefined || raw === null) return null;
	const normalized = raw.trim().toLowerCase();
	return normalized === "" ? null : normalized;
}

/**
 * Resolves the participant row for an already-normalized email within a
 * project. Returns null when the speaker hasn't subscribed (yet) with the
 * matching email — the speaker stays an unlinked static card.
 */
export async function resolveSpeakerParticipantId(
	projectId: string,
	normalizedEmail: string,
): Promise<string | null> {
	const matchedUser = await db.query.user.findFirst({
		where: ilike(user.email, normalizedEmail),
		columns: { id: true },
	});
	if (!matchedUser) return null;
	const matchedParticipant = await db.query.participant.findFirst({
		where: and(
			eq(participant.projectId, projectId),
			eq(participant.userId, matchedUser.id),
		),
		columns: { id: true },
	});
	return matchedParticipant?.id ?? null;
}

async function assertNoLinkConflicts(input: {
	projectId: string;
	email: string | null;
	participantId: string | null;
	ignoreSpeakerId?: number;
}) {
	const { projectId, email, participantId, ignoreSpeakerId } = input;
	if (email) {
		const emailClauses = [
			eq(speaker.projectId, projectId),
			eq(speaker.email, email),
		];
		if (ignoreSpeakerId !== undefined) {
			emailClauses.push(ne(speaker.id, ignoreSpeakerId));
		}
		const emailTaken = await db.query.speaker.findFirst({
			where: and(...emailClauses),
			columns: { id: true },
		});
		if (emailTaken) {
			throw new TRPCError({
				code: "CONFLICT",
				message: "Outro palestrante já usa este e-mail neste evento.",
			});
		}
	}
	if (participantId) {
		const participantClauses = [
			eq(speaker.projectId, projectId),
			eq(speaker.participantId, participantId),
		];
		if (ignoreSpeakerId !== undefined) {
			participantClauses.push(ne(speaker.id, ignoreSpeakerId));
		}
		const participantTaken = await db.query.speaker.findFirst({
			where: and(...participantClauses),
			columns: { id: true },
		});
		if (participantTaken) {
			throw new TRPCError({
				code: "CONFLICT",
				message:
					"Este participante já está vinculado a outro palestrante.",
			});
		}
	}
}

const speakerEmailInput = z
	.union([z.email(), z.literal(""), z.null()])
	.optional();

const speakerTitleInput = z.string().max(140).nullable().optional();

/** Drops rows the organizer left blank before validation. */
const speakerSocialsInput = z
	.preprocess(
		(v) =>
			Array.isArray(v)
				? v.filter(
						(e) =>
							e &&
							typeof (e as { value?: unknown }).value ===
								"string" &&
							(e as { value: string }).value.trim() !== "",
					)
				: v,
		z.array(socialEntrySchema).max(8),
	)
	.optional();

function normalizeSpeakerTitle(raw: string | null | undefined) {
	if (raw === undefined) return undefined;
	const title = raw?.trim() ?? "";
	return title === "" ? null : title;
}

function normalizeSpeakerSocials(
	raw: SocialLinks | undefined,
): SocialLinks | undefined {
	if (raw === undefined) return undefined;
	return raw.map((e) => ({
		service: e.service,
		value: e.value.trim(),
	}));
}

export const speakersRouter = createTRPCRouter({
	createSpeaker: protectedProcedure
		.input(
			z.object({
				name: z.string(),
				description: z.string(),
				imageUrl: z.string(),
				projectId: z.string().uuid(),
				email: speakerEmailInput,
				title: speakerTitleInput,
				socials: speakerSocialsInput,
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { name, description, imageUrl, projectId } = input;
			await requireProjectAccess(projectId, ctx.session.user.id);

			const email = normalizeSpeakerEmail(input.email ?? null);
			const participantId = email
				? await resolveSpeakerParticipantId(projectId, email)
				: null;
			await assertNoLinkConflicts({ projectId, email, participantId });

			const created = await db
				.insert(speaker)
				.values({
					name,
					description,
					imageUrl,
					projectId,
					email,
					participantId,
					title: normalizeSpeakerTitle(input.title) ?? null,
					socials: normalizeSpeakerSocials(input.socials) ?? [],
				})
				.returning({ id: speaker.id });
			return { id: created[0]?.id };
		}),

	updateSpeaker: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				name: z.string(),
				description: z.string(),
				imageUrl: z.string(),
				projectId: z.string().uuid(),
				// undefined = keep current link; null/"" = unlink; email = (re)link.
				email: speakerEmailInput,
				// undefined = keep; null/"" = clear.
				title: speakerTitleInput,
				// undefined = keep; [] = clear all.
				socials: speakerSocialsInput,
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { id, name, description, imageUrl, projectId } = input;
			await requireProjectAccess(projectId, ctx.session.user.id);

			const existing = await db.query.speaker.findFirst({
				where: eq(speaker.id, id),
			});
			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Palestrante não encontrado.",
				});
			}

			let email = existing.email;
			let participantId = existing.participantId;
			if (input.email !== undefined) {
				// Organizer corrected (or cleared) the email: drop the old
				// resolution and try to link the new one immediately, so a
				// correction takes effect without waiting for re-subscribe.
				email = normalizeSpeakerEmail(input.email);
				participantId = email
					? await resolveSpeakerParticipantId(projectId, email)
					: null;
				await assertNoLinkConflicts({
					projectId,
					email,
					participantId,
					ignoreSpeakerId: id,
				});
			}

			const nextTitle =
				input.title !== undefined
					? normalizeSpeakerTitle(input.title)
					: undefined;
			const nextSocials = normalizeSpeakerSocials(input.socials);

			await db
				.update(speaker)
				.set({
					name,
					description,
					imageUrl,
					projectId,
					email,
					participantId,
					...(nextTitle !== undefined ? { title: nextTitle } : {}),
					...(nextSocials !== undefined
						? { socials: nextSocials }
						: {}),
				})
				.where(eq(speaker.id, id));
			return { updated: true };
		}),

	getSpeaker: protectedProcedure
		.input(z.object({ id: z.number() }))
		.query(async ({ input, ctx }) => {
			const speakerData = await db.query.speaker.findFirst({
				where: eq(speaker.id, input.id),
				with: {
					linkedParticipant: {
						columns: { id: true, shortId: true },
					},
				},
			});
			if (!speakerData) {
				throw new Error("Speaker not found");
			}
			// Speakers carry the linking email: organizer-only.
			await requireProjectAccess(
				speakerData.projectId,
				ctx.session.user.id,
			);
			return speakerData;
		}),

	getSpeakers: protectedProcedure
		.input(z.object({ projectId: z.string().uuid().optional() }))
		.query(async ({ input, ctx }) => {
			if (input?.projectId) {
				await requireProjectAccess(
					input.projectId,
					ctx.session.user.id,
				);
				return db.query.speaker.findMany({
					where: eq(speaker.projectId, input.projectId),
					with: {
						linkedParticipant: {
							columns: { id: true, shortId: true },
						},
					},
				});
			}
			return db.query.speaker.findMany({
				with: {
					linkedParticipant: {
						columns: { id: true, shortId: true },
					},
				},
			});
		}),

	deleteSpeaker: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				projectId: z.string().uuid().optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const existing = await db.query.speaker.findFirst({
				where: eq(speaker.id, input.id),
				columns: { id: true, projectId: true },
			});
			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Palestrante não encontrado.",
				});
			}
			if (input.projectId && existing.projectId !== input.projectId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Sem permissão neste evento.",
				});
			}
			await requireProjectAccess(existing.projectId, ctx.session.user.id);
			await db.delete(speaker).where(eq(speaker.id, input.id));
			return { success: true };
		}),

	/**
	 * Claims unlinked speaker rows matching a normalized email. Called after
	 * subscribe; also usable as a repair job. Never steals a link from
	 * another speaker (participantId IS NULL guard + conflict check).
	 */
	claimSpeakersForParticipant: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
				participantId: z.string().uuid(),
				email: z.email(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await requireProjectAccess(input.projectId, ctx.session.user.id);
			const email = normalizeSpeakerEmail(input.email);
			if (!email) return { claimed: 0 };
			const candidates = await db.query.speaker.findMany({
				where: and(
					eq(speaker.projectId, input.projectId),
					eq(speaker.email, email),
					isNull(speaker.participantId),
				),
				columns: { id: true },
			});
			if (candidates.length === 0) return { claimed: 0 };
			const alreadyLinked = await db.query.speaker.findFirst({
				where: and(
					eq(speaker.projectId, input.projectId),
					eq(speaker.participantId, input.participantId),
				),
				columns: { id: true },
			});
			if (alreadyLinked) return { claimed: 0 };
			const first = candidates[0];
			if (!first) return { claimed: 0 };
			await db
				.update(speaker)
				.set({ participantId: input.participantId })
				.where(eq(speaker.id, first.id));
			return { claimed: 1 };
		}),
});
