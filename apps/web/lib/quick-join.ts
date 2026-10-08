import {
	isActivityEnded,
	isActivityFull,
	isRegistrationClosed,
} from "./activity-conditions";

import type { ActivitySessionLike } from "./date";

export interface QuickJoinActivity {
	id: string;
	workload?: number | null;
	isRegistrationOpen?: boolean | null;
	participantsLimit?: number | null;
	participantsCount?: number | null;
	sessions?: ActivitySessionLike[] | null;
	tolerance?: number | null;
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
}

/**
 * Única fonte de verdade da elegibilidade ao quick join: permitido só
 * quando tudo abaixo é verdade — logado, no evento, botão de inscrição
 * visível (`workload > 0`, mesma condição do card), inscrições abertas,
 * vaga disponível (ou sem limite), atividade não encerrada, ainda não
 * inscrito, sem formulário e sem fila de espera. Caso contrário o card
 * mantém o `<Link>` para a página da atividade.
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
	if (activity.tolerance) return false;
	return true;
}
