import { describeSeats, hasAvailableSeat } from "./activity-seats";
import { hasEverySessionEnded, type ActivitySessionLike } from "./date";

export interface ActivityConditionSource {
	sessions?: ActivitySessionLike[] | null;
	isRegistrationOpen?: boolean | null;
	participantsLimit?: number | null;
	waitlistEnabled?: boolean | null;
	tolerance?: number | null;
}

/**
 * Predicados puros da situação da atividade, compartilhados entre a
 * máquina de estados da página (`useActivityEnrollmentState`) e a
 * elegibilidade do quick join: uma única definição de "encerrada",
 * "inscrições fechadas" e "lotada".
 */

/** Todas as sessões já terminaram. */
export function isActivityEnded(
	sessions: ActivitySessionLike[] | undefined | null,
): boolean {
	return hasEverySessionEnded(sessions);
}

/** Inscrições fechadas (flag da atividade). */
export function isRegistrationClosed(activity: {
	isRegistrationOpen?: boolean | null;
}): boolean {
	return !activity.isRegistrationOpen;
}

/**
 * Lotada: não há vaga disponível. É exatamente a expressão que a máquina
 * de estados já usava: limite com contagem desconhecida (`null`) lê como
 * lotada — direção conservadora (nunca adivinhar vaga), mantida aqui para
 * a máquina e o quick join concordarem sempre.
 */
export function isActivityFull(
	participantsLimit: number | null | undefined,
	participantsCount: number | null | undefined,
): boolean {
	return !hasAvailableSeat(
		describeSeats({ participantsLimit, participantsCount }),
	);
}

/**
 * A atividade oferece ação de fila quando lotada: só com a fila ligada.
 * Ausente (`null`/`undefined`, dados antigos) lê como ligada — direção
 * conservadora, como `isActivityFull` acima.
 */
export function offersWaitlistSpot(activity: {
	waitlistEnabled?: boolean | null;
}): boolean {
	return activity.waitlistEnabled !== false;
}

/**
 * Tolerância efetiva: a tolerância só tem sentido com fila (é o prazo
 * para ceder a vaga a quem espera). Com a fila desligada, lê como vazia
 * mesmo que um valor obsoleto esteja salvo — nunca apagamos o valor
 * guardado ao desligar.
 */
export function getEffectiveTolerance(activity: {
	waitlistEnabled?: boolean | null;
	tolerance?: number | null;
}): number | null {
	if (!offersWaitlistSpot(activity)) return null;
	return activity.tolerance ?? null;
}
