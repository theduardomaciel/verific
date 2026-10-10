/**
 * Lógica compartilhada do indicador de vagas ("N vagas restantes" /
 * "Últimas vagas!" / "Esgotado"), usada pelo `ActivityCard` e pela página
 * da atividade para nunca divergirem.
 */
export type SeatsStatus = "unlimited" | "many" | "low" | "full" | "unknown";

export interface SeatsInfo {
	/** Vagas restantes (`null` quando ilimitado ou desconhecido). */
	remaining: number | null;
	status: SeatsStatus;
	/** Texto pronto para exibição (`null` quando não há o que mostrar). */
	label: string | null;
	/** `true` quando a contagem é desconhecida apesar do limite existir. */
	isUnknown: boolean;
}

interface DescribeSeatsArgs {
	participantsLimit?: number | null;
	/** Total de inscritos (`null` quando desconhecido). */
	participantsCount?: number | null;
	lowSeatsThreshold?: number;
}

export function describeSeats({
	participantsLimit,
	participantsCount,
	lowSeatsThreshold = 7,
}: DescribeSeatsArgs): SeatsInfo {
	if (participantsLimit == null) {
		return {
			remaining: null,
			status: "unlimited",
			label: null,
			isUnknown: false,
		};
	}

	if (participantsCount == null) {
		return {
			remaining: null,
			status: "unknown",
			label: "Vagas limitadas",
			isUnknown: true,
		};
	}

	const remaining = participantsLimit - participantsCount;

	if (remaining <= 0) {
		return {
			remaining: 0,
			status: "full",
			label: "Esgotado",
			isUnknown: false,
		};
	}

	if (remaining <= lowSeatsThreshold) {
		return {
			remaining,
			status: "low",
			label: "Últimas vagas!",
			isUnknown: false,
		};
	}

	return {
		remaining,
		status: "many",
		label: `${remaining} vagas restantes`,
		isUnknown: false,
	};
}

/** Atalho para o gate de inscrição: há vaga quando ilimitado ou restante > 0. */
export function hasAvailableSeat(info: SeatsInfo): boolean {
	return (
		info.status === "unlimited" ||
		info.status === "many" ||
		info.status === "low"
	);
}
