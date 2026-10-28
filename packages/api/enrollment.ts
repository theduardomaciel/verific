import { TRPCError } from "@trpc/server";

import { db } from "@verific/drizzle";
import { parseGamificationConfig } from "@verific/drizzle/gamification";
import { and, eq, inArray, sql } from "@verific/drizzle/orm";
import {
	activity,
	formAnswer,
	formVersion,
	participant,
	participantOnActivity,
	project,
} from "@verific/drizzle/schema";
import type { z } from "@verific/zod";

import { recordParticipantEvents } from "./lib/event-log";
import { awardEnrollment } from "./lib/gamification";
import {
	buildAnswerRows,
	getPublishedVersionWithFields,
	toValidationFields,
	toVisibilitySections,
} from "./routers/forms";
import { findScheduleConflicts } from "./schedule-conflicts";
import { validateAnswers, type answerValueSchema } from "./schemas";
import { countEnrolled, occupancyColumns, type Tx } from "./seats";

export type FormAnswersInput = {
	answers: Record<string, z.infer<typeof answerValueSchema>>;
};

/** Participante de quem pede a inscrição, com a lotação da atividade. */
export async function findJoinRequester(
	projectId: string,
	userId: string,
	activityId: string,
) {
	const [row] = await db
		.select({ id: participant.id, ...occupancyColumns(activityId) })
		.from(participant)
		.where(
			and(
				eq(participant.projectId, projectId),
				eq(participant.userId, userId),
			),
		);
	return row ?? null;
}

/**
 * Serializa as operações de um mesmo participante (inscrição, fila,
 * confirmação). Vem sempre antes de `lockActivity`; com vários
 * participantes, trave-os em ordem de id.
 */
export async function lockParticipant(tx: Tx, participantId: string) {
	await tx.execute(
		sql`SELECT pg_advisory_xact_lock(hashtext(${"activity-join:" + participantId}))`,
	);
}

export async function assertNoScheduleConflict(
	tx: Tx,
	activityId: string,
	participantId: string,
) {
	const target = await tx.query.activity.findFirst({
		where: eq(activity.id, activityId),
		columns: { id: true, name: true, workload: true, allowOverlap: true },
		with: { sessions: { columns: { startsAt: true, endsAt: true } } },
	});
	if (!target) {
		throw new TRPCError({
			message: "Activity not found.",
			code: "BAD_REQUEST",
		});
	}

	// Só conta vínculo `participant` (monitor não é inscrição)
	const enrolledRows = await tx.query.participantOnActivity.findMany({
		where: and(
			eq(participantOnActivity.participantId, participantId),
			eq(participantOnActivity.role, "participant"),
		),
		with: {
			activity: {
				columns: {
					id: true,
					name: true,
					workload: true,
					allowOverlap: true,
					cancelledAt: true,
				},
				with: {
					sessions: { columns: { startsAt: true, endsAt: true } },
				},
			},
		},
	});

	const conflicts = findScheduleConflicts(
		target,
		enrolledRows
			.map((row) => row.activity)
			.filter((enrolled) => enrolled.cancelledAt === null),
		new Date(),
	);
	if (conflicts.length > 0) {
		throw new TRPCError({
			message: "Você já está inscrito em outra atividade neste horário.",
			code: "BAD_REQUEST",
			cause: { code: "SCHEDULE_CONFLICT" },
		});
	}
}

/**
 * Valida as respostas do formulário de inscrição da atividade e monta as
 * linhas a gravar. Sem respostas, só bloqueia quem se inscreve sozinho
 * (`subscribesSelf`) quando o formulário exige preenchimento.
 */
export async function prepareActivityAnswers(args: {
	projectId: string;
	activityId: string;
	participantIds: string[];
	formAnswers: FormAnswersInput | undefined;
	subscribesSelf: boolean;
}) {
	const { projectId, activityId, participantIds, formAnswers } = args;

	const { version, fields, sections } = await getPublishedVersionWithFields(
		projectId,
		activityId,
	);
	if (!version) return [];

	if (formAnswers) {
		if (participantIds.length !== 1) {
			throw new TRPCError({
				message:
					"Respostas só podem ser enviadas para uma inscrição por vez.",
				code: "BAD_REQUEST",
			});
		}
		const validation = validateAnswers(
			toValidationFields(fields),
			formAnswers.answers,
			toVisibilitySections(sections),
		);
		if (!validation.success) {
			throw new TRPCError({
				message:
					"Respostas inválidas. Verifique os campos obrigatórios.",
				code: "BAD_REQUEST",
				cause: { code: "FORM_REQUIRED", errors: validation.errors },
			});
		}
		return buildAnswerRows({
			participantId: participantIds[0]!,
			projectId,
			versionId: version.id,
			fields,
			sections,
			data: validation.data as Record<string, unknown>,
		});
	}

	if (args.subscribesSelf) {
		const probe = validateAnswers(
			toValidationFields(fields),
			{},
			toVisibilitySections(sections),
		);
		if (!probe.success) {
			throw new TRPCError({
				message:
					"Esta atividade exige o preenchimento do formulário de inscrição.",
				code: "BAD_REQUEST",
				cause: { code: "FORM_REQUIRED", errors: probe.errors },
			});
		}
	}
	return [];
}

export async function saveActivityAnswers(
	tx: Tx,
	answerRows: Awaited<ReturnType<typeof prepareActivityAnswers>>,
) {
	if (answerRows.length === 0) return;

	await tx
		.insert(formAnswer)
		.values(answerRows)
		.onConflictDoUpdate({
			target: [formAnswer.participantId, formAnswer.fieldId],
			set: {
				valueText: sql`excluded."value_text"`,
				valueNumber: sql`excluded."value_number"`,
				valueDate: sql`excluded."value_date"`,
				valueJson: sql`excluded."value_json"`,
				fieldSnapshot: sql`excluded."field_snapshot"`,
			},
		});
}

/**
 * Persiste a inscrição (vínculos + respostas) dentro da transação que
 * travou a atividade.
 * Só insere; nunca remove nada. Devolve apenas os vínculos novos (com o
 * `subscribedAt` gravado), para o trigger de e-mail não notificar quem já
 * estava inscrito, e se a inscrição rendeu pontos, para o cache de
 * gamificação só ser invalidado quando algo mudou.
 */
export async function persistEnrollment(
	tx: Tx,
	args: {
		projectId: string;
		activityId: string;
		participantIds: string[];
		answerRows: Awaited<ReturnType<typeof prepareActivityAnswers>>;
		/**
		 * Inscrição autorizada além do limite. As linhas que efetivamente
		 * excederem as vagas são marcadas para a organização enxergar o
		 * overbooking e decidir como agir.
		 */
		overCapacity?: {
			actorUserId: string;
			reason?: string | null;
		};
	},
): Promise<{
	inserted: Array<{
		participantId: string;
		subscribedAt: Date;
		overbooked: boolean;
	}>;
	pointsAwarded: boolean;
}> {
	const { projectId, activityId, participantIds, answerRows } = args;

	const [activityRow] = await tx
		.select({ participantsLimit: activity.participantsLimit })
		.from(activity)
		.where(eq(activity.id, activityId));
	const enrolledBefore = args.overCapacity
		? await countEnrolled(tx, activityId)
		: 0;

	const inserted = await tx
		.insert(participantOnActivity)
		.values(
			participantIds.map((participantId) => ({
				activityId,
				participantId,
			})),
		)
		.onConflictDoNothing()
		.returning({
			participantId: participantOnActivity.participantId,
			subscribedAt: participantOnActivity.subscribedAt,
		});

	const overbookedIds = new Set<string>();
	if (args.overCapacity && activityRow?.participantsLimit != null) {
		const overflow = Math.max(
			0,
			enrolledBefore + inserted.length - activityRow.participantsLimit,
		);
		// `returning` preserva a ordem dos valores inseridos no Postgres; os
		// últimos são os que de fato excederam o limite.
		if (overflow > 0) {
			for (const row of inserted.slice(-overflow)) {
				overbookedIds.add(row.participantId);
			}
		}
		if (overbookedIds.size > 0) {
			await tx
				.update(participantOnActivity)
				.set({
					overbooked: true,
					overbookReason: args.overCapacity.reason ?? null,
					overbookedByUserId: args.overCapacity.actorUserId,
					overbookedAt: new Date(),
				})
				.where(
					and(
						eq(participantOnActivity.activityId, activityId),
						inArray(participantOnActivity.participantId, [
							...overbookedIds,
						]),
					),
				);
		}
	}

	await saveActivityAnswers(tx, answerRows);

	if (inserted.length > 0) {
		await recordParticipantEvents(
			tx,
			{ projectId, activityId, type: "enrollment.created" },
			inserted.map((row) => row.participantId),
		);
		if (overbookedIds.size > 0) {
			await recordParticipantEvents(
				tx,
				{
					projectId,
					activityId,
					type: "enrollment.overbooked",
					actorUserId: args.overCapacity?.actorUserId ?? null,
					metadata: { reason: args.overCapacity?.reason ?? null },
				},
				[...overbookedIds],
			);
		}
	}

	// Gamificação é acessória: roda num savepoint e nunca desfaz a
	// inscrição. Só pontua vínculos realmente novos.
	let pointsAwarded = false;
	if (inserted.length > 0) {
		const [projectRow] = await tx
			.select({
				id: project.id,
				ownerId: project.ownerId,
				startDate: project.startDate,
				endDate: project.endDate,
				gamification: project.gamification,
			})
			.from(project)
			.where(eq(project.id, projectId));
		const config = parseGamificationConfig(projectRow?.gamification);
		if (projectRow && config.enabled && config.enrollmentPoints > 0) {
			try {
				let total = 0;
				await tx.transaction(async (sp) => {
					for (const row of inserted) {
						total += await awardEnrollment(sp, {
							project: projectRow,
							participantId: row.participantId,
							activityId,
						});
					}
				});
				pointsAwarded = total > 0;
			} catch {
				// Pontos nunca bloqueiam a inscrição.
			}
		}
	}

	return {
		inserted: inserted.map((row) => ({
			...row,
			overbooked: overbookedIds.has(row.participantId),
		})),
		pointsAwarded,
	};
}

export async function deleteActivityAnswers(
	tx: Tx,
	activityId: string,
	participantIds: string[],
) {
	if (participantIds.length === 0) return;

	const versions = await tx
		.select({ id: formVersion.id })
		.from(formVersion)
		.where(eq(formVersion.activityId, activityId));
	if (versions.length === 0) return;

	await tx.delete(formAnswer).where(
		and(
			inArray(formAnswer.participantId, participantIds),
			inArray(
				formAnswer.formVersionId,
				versions.map((v) => v.id),
			),
		),
	);
}
