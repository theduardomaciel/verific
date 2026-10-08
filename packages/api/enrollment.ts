import { TRPCError } from "@trpc/server";

import { and, eq, inArray, sql } from "@verific/drizzle/orm";
import {
	activity,
	formAnswer,
	formVersion,
	participantOnActivity,
} from "@verific/drizzle/schema";
import type { z } from "@verific/zod";

import {
	buildAnswerRows,
	getPublishedVersionWithFields,
	toValidationFields,
	toVisibilitySections,
} from "./routers/forms";
import { findScheduleConflicts } from "./schedule-conflicts";
import { validateAnswers, type answerValueSchema } from "./schemas";

import type { Tx } from "./seats";

export type FormAnswersInput = {
	answers: Record<string, z.infer<typeof answerValueSchema>>;
};

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
				},
				with: {
					sessions: { columns: { startsAt: true, endsAt: true } },
				},
			},
		},
	});

	const conflicts = findScheduleConflicts(
		target,
		enrolledRows.map((row) => row.activity),
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
				updatedAt: new Date(),
			},
		});
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
