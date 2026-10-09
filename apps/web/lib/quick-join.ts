import {
	getEffectiveTolerance,
	isActivityEnded,
	isActivityFull,
	isRegistrationClosed,
} from "./activity-conditions";

import type { ActivitySessionLike } from "./date";
import type { Conflict } from "./schedule/conflicts";

export interface QuickJoinActivity {
	id: string;
	workload?: number | null;
	isRegistrationOpen?: boolean | null;
	participantsLimit?: number | null;
	participantsCount?: number | null;
	sessions?: ActivitySessionLike[] | null;
	tolerance?: number | null;
	waitlistEnabled?: boolean | null;
	/**
	 * `false` = sem formulário; `true` = com formulário; `undefined` =
	 * desconhecido. Desconhecido nunca é adivinhado: inelegível.
	 */
	hasForm?: boolean;
}

export interface QuickJoinMembership {
	userId?: string | null;
	participantId?: string | null;
	subscribedIds?: string[] | null;
	/** Conflitos de horário já calculados (aviso, nunca bloqueio aqui). */
	conflicts?: Conflict[];
}

export type QuickJoinBlockReason = "conflict";

/**
 * Motivo distinguível de inelegibilidade por conflito: `null` quando o
 * conflito não é o motivo (elegível ou barrado por outra regra). As
 * demais regras continuam booleanas em `getQuickJoinEligibility`.
 */
export function getQuickJoinBlockReason(
	activity: QuickJoinActivity,
	membership: QuickJoinMembership,
): QuickJoinBlockReason | null {
	if ((membership.conflicts ?? []).length === 0) return null;
	if (!membership.userId) return null;
	if (!membership.participantId) return null;
	if (membership.subscribedIds?.includes(activity.id)) return null;
	return "conflict";
}

/**
 * Única fonte de verdade da elegibilidade ao quick join: permitido só
 * quando tudo abaixo é verdade — logado, no evento, botão de inscrição
 * visível (`workload > 0`, mesma condição do card), inscrições abertas,
 * vaga disponível (ou sem limite), atividade não encerrada, ainda não
 * inscrito, sem formulário, sem fila de espera e sem conflito de
 * horário. Caso contrário o card mantém o `<Link>` para a página.
 */
export function getQuickJoinEligibility(
	activity: QuickJoinActivity,
	membership: QuickJoinMembership,
): boolean {
	if (!membership.userId) return false;
	if (!membership.participantId) return false;
	if (!((activity.workload ?? 0) > 0)) return false;
	if (isRegistrationClosed(activity)) return false;
	if (isActivityFull(activity.participantsLimit, activity.participantsCount))
		return false;
	if (isActivityEnded(activity.sessions)) return false;
	if (membership.subscribedIds?.includes(activity.id)) return false;
	if (activity.hasForm !== false) return false;
	if (getEffectiveTolerance(activity)) return false;
	if ((membership.conflicts ?? []).length > 0) return false;
	return true;
}
