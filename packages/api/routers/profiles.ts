import { randomBytes } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { z } from "@verific/zod";

import { db } from "@verific/drizzle";
import { participant, profile, project } from "@verific/drizzle/schema";
import {
	DEFAULT_PRIVACY,
	profileInputSchema,
	type ProfilePrivacy,
	type SocialLink,
} from "@verific/drizzle/profile";
import { and, eq } from "@verific/drizzle/orm";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

/** Identificador curto por participante/evento (URL + QR). */
export function generateShortId(length = 10): string {
	return randomBytes(length).toString("base64url").slice(0, length);
}

async function resolveProjectId(projectUrl: string) {
	const found = await db.query.project.findFirst({
		where: eq(project.url, projectUrl),
		columns: { id: true },
	});
	if (!found) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado." });
	}
	return found.id;
}

/** Preenche shortId ausente (participantes criados antes da Fase 4). */
export async function ensureShortId(
	participantId: string,
	current: string | null,
): Promise<string> {
	if (current) return current;
	let lastError: unknown = null;
	for (let i = 0; i < 5; i++) {
		const shortId = generateShortId();
		try {
			await db
				.update(participant)
				.set({ shortId })
				.where(eq(participant.id, participantId));
			return shortId;
		} catch (e) {
			lastError = e;
			const msg = e instanceof Error ? e.message : String(e);
			if (!/unique|duplicate/i.test(msg)) throw e;
		}
	}
	throw (
		(lastError instanceof Error && lastError) ||
		new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Falha ao gerar identificador do perfil.",
		})
	);
}

function resolveAvatar(input: {
	avatarSource: string | null;
	avatarGithubHandle: string | null;
	googleImage: string | null;
}): { kind: "google" | "github" | "initials"; url: string | null } {
	if (input.avatarSource === "github" && input.avatarGithubHandle) {
		return {
			kind: "github",
			url: `https://github.com/${input.avatarGithubHandle}.png`,
		};
	}
	if (input.avatarSource !== "initials" && input.googleImage) {
		return { kind: "google", url: input.googleImage };
	}
	return { kind: "initials", url: null };
}

export function getAge(birthDate: Date): number {
	const today = new Date();
	let age = today.getFullYear() - birthDate.getFullYear();
	const monthDiff = today.getMonth() - birthDate.getMonth();
	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
		age--;
	}
	return age;
}

export const profilesRouter = createTRPCRouter({
	/** Participante atual no evento (com shortId; preenche se ausente). */
	getMyParticipant: protectedProcedure
		.input(z.object({ projectUrl: z.string() }))
		.query(async ({ input, ctx }) => {
			const projectId = await resolveProjectId(input.projectUrl);
			const row = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, projectId),
					eq(participant.userId, ctx.session.user.id),
				),
			});
			if (!row) return null;
			const shortId = await ensureShortId(row.id, row.shortId);
			return { participantId: row.id, shortId };
		}),

	/** Perfil público: só dados com privacidade `public` (nunca PII privada). */
	getPublicProfile: publicProcedure
		.input(z.object({ projectUrl: z.string(), shortId: z.string() }))
		.query(async ({ input }) => {
			const projectRow = await db.query.project.findFirst({
				where: eq(project.url, input.projectUrl),
				columns: { id: true, profilesEnabled: true },
			});
			if (!projectRow?.profilesEnabled) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Perfil não encontrado." });
			}
			const row = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, projectRow.id),
					eq(participant.shortId, input.shortId),
				),
				with: {
					user: { columns: { name: true, image_url: true } },
					profile: true,
				},
			});
			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Perfil não encontrado." });
			}
			const privacy: ProfilePrivacy = {
				...DEFAULT_PRIVACY,
				...(row.profile?.privacy ?? {}),
			};
			const socials: SocialLink[] = (row.profile?.socials ?? []).filter((s) => {
				if (s.network === "github") return privacy.github === "public";
				if (s.network === "instagram") return privacy.instagram === "public";
				return true;
			});
			return {
				shortId: row.shortId,
				name: row.user.name,
				avatar: resolveAvatar({
					avatarSource: row.profile?.avatarSource ?? null,
					avatarGithubHandle: row.profile?.avatarGithubHandle ?? null,
					googleImage: row.user.image_url,
				}),
				roleTitle: row.profile?.roleTitle ?? null,
				bio: row.profile?.bio ?? null,
				birth:
					privacy.birthDate === "public" && row.profile?.birthDate
						? {
								age: getAge(new Date(row.profile.birthDate)),
								formatted: new Date(row.profile.birthDate).toLocaleDateString(
									"pt-BR",
									{ day: "numeric", month: "long", year: "numeric" },
								),
							}
						: null,
				city: privacy.city === "public" ? (row.profile?.city ?? null) : null,
				institution:
					privacy.institution === "public" ? (row.profile?.institution ?? null) : null,
				socials,
				publicEmail:
					privacy.email === "public" ? (row.profile?.publicEmail ?? null) : null,
			};
		}),

	/** Perfil completo do dono (edição + ilhas privadas). */
	getMyProfile: protectedProcedure
		.input(z.object({ projectUrl: z.string() }))
		.query(async ({ input, ctx }) => {
			const projectId = await resolveProjectId(input.projectUrl);
			const row = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, projectId),
					eq(participant.userId, ctx.session.user.id),
				),
				with: {
					user: { columns: { name: true, email: true, image_url: true } },
					profile: true,
				},
			});
			if (!row) return null;
			const shortId = await ensureShortId(row.id, row.shortId);
			return {
				participantId: row.id,
				shortId,
				name: row.user.name,
				accountEmail: row.user.email,
				googleImage: row.user.image_url,
				profile: row.profile
					? {
							roleTitle: row.profile.roleTitle,
							birthDate: row.profile.birthDate,
							city: row.profile.city,
							institution: row.profile.institution,
							bio: row.profile.bio,
							socials: row.profile.socials ?? [],
							publicEmail: row.profile.publicEmail,
							avatarSource: row.profile.avatarSource ?? "google",
							avatarGithubHandle: row.profile.avatarGithubHandle,
							privacy: { ...DEFAULT_PRIVACY, ...(row.profile.privacy ?? {}) },
						}
					: null,
			};
		}),

	/** Cria/atualiza o perfil do dono. */
	updateProfile: protectedProcedure
		.input(z.object({ projectUrl: z.string(), profile: profileInputSchema }))
		.mutation(async ({ input, ctx }) => {
			const projectRow = await db.query.project.findFirst({
				where: eq(project.url, input.projectUrl),
				columns: { id: true, profilesEnabled: true },
			});
			if (!projectRow) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado." });
			}
			const row = await db.query.participant.findFirst({
				where: and(
					eq(participant.projectId, projectRow.id),
					eq(participant.userId, ctx.session.user.id),
				),
			});
			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Inscrição não encontrada." });
			}
			const p = input.profile;
			const set = {
				roleTitle: p.roleTitle ?? null,
				birthDate: p.birthDate ? new Date(p.birthDate) : null,
				city: p.city ?? null,
				institution: p.institution ?? null,
				bio: p.bio ?? null,
				socials: p.socials,
				publicEmail: p.publicEmail ?? null,
				avatarSource: p.avatarSource,
				avatarGithubHandle: p.avatarGithubHandle ?? null,
				privacy: p.privacy,
				updatedAt: new Date(),
			};
			await db
				.insert(profile)
				.values({ participantId: row.id, ...set })
				.onConflictDoUpdate({ target: profile.participantId, set });
			const shortId = await ensureShortId(row.id, row.shortId);
			return { shortId };
		}),
});
