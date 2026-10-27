/**
 * Permissões de equipe por evento.
 *
 * Client-safe (só TypeScript puro): o dashboard usa a mesma lista para
 * renderizar a navegação e o editor de equipe, e o servidor usa para
 * autorizar cada procedure.
 *
 * O dono do evento (`projects.owner_id`) é implícito e sempre tem todas as
 * permissões. Quem está em `project_moderators` tem um papel (`admin` ou
 * `staff`) e, opcionalmente, uma lista explícita de permissões que substitui
 * os padrões do papel.
 */

export const PROJECT_PERMISSIONS = [
	/** Configurações do evento, tema, perfil, formulários, badges e notificações. */
	"event.manage",
	/** Criar/editar atividades, inscrever e remover participantes delas. */
	"activities.manage",
	/** Cancelar/excluir atividades (irreversível). */
	"activities.cancel",
	/** Ver a lista de participantes e seus dados de contato. */
	"participants.view",
	/** Remover participantes do evento. */
	"participants.manage",
	/** Credenciar na recepção e nas sessões (check-in/check-out). */
	"reception.manage",
	/** Operar a fila de espera (promover, remover, processar). */
	"waitlist.manage",
	/** Configurar gamificação, conceder pontos e adesivos. */
	"ranking.manage",
	/** Ver/reprocessar e-mails e configurar notificações. */
	"emails.manage",
	/** Adicionar, remover e alterar membros da equipe. */
	"team.manage",
] as const;

export type ProjectPermission = (typeof PROJECT_PERMISSIONS)[number];

export const projectMemberRoles = ["admin", "staff"] as const;
export type ProjectMemberRole = (typeof projectMemberRoles)[number];

export const PROJECT_ROLE_LABELS: Record<ProjectMemberRole, string> = {
	admin: "Administrador",
	staff: "Monitor",
};

export const PROJECT_ROLE_DESCRIPTIONS: Record<ProjectMemberRole, string> = {
	admin: "Gerencia o evento, atividades, participantes e configurações. Não altera a equipe nem exclui o evento.",
	staff: "Acesso operacional: credencia participantes na recepção e consulta a lista de inscritos.",
};

/**
 * Permissões padrão de cada papel. `team.manage` e `activities.cancel`
 * continuam exclusivos do dono por padrão; podem ser delegados explicitamente
 * em `project_moderators.permissions`.
 */
export const PROJECT_ROLE_DEFAULTS: Record<
	ProjectMemberRole,
	readonly ProjectPermission[]
> = {
	admin: [
		"event.manage",
		"activities.manage",
		"participants.view",
		"participants.manage",
		"reception.manage",
		"waitlist.manage",
		"ranking.manage",
		"emails.manage",
	],
	staff: ["participants.view", "reception.manage"],
};

export const PROJECT_PERMISSION_LABELS: Record<
	ProjectPermission,
	{ label: string; description: string }
> = {
	"event.manage": {
		label: "Configurações do evento",
		description:
			"Tema, perfil, formulários, badges e preferências gerais do evento.",
	},
	"activities.manage": {
		label: "Gerenciar atividades",
		description:
			"Criar/editar atividades, inscrever participantes e definir monitores.",
	},
	"activities.cancel": {
		label: "Cancelar atividades",
		description: "Cancelar ou excluir atividades do evento.",
	},
	"participants.view": {
		label: "Ver participantes",
		description:
			"Consultar inscritos, contatos e respostas do formulário do evento.",
	},
	"participants.manage": {
		label: "Gerenciar participantes",
		description: "Remover inscrições do evento.",
	},
	"reception.manage": {
		label: "Recepção e credenciamento",
		description:
			"Fazer check-in/check-out na recepção e nas sessões das atividades.",
	},
	"waitlist.manage": {
		label: "Gerenciar fila de espera",
		description:
			"Promover, remover e processar as ofertas da fila de espera.",
	},
	"ranking.manage": {
		label: "Gerenciar ranking",
		description:
			"Configurar gamificação, conceder pontos e adesivos manualmente.",
	},
	"emails.manage": {
		label: "Gerenciar e-mails",
		description: "Ver, reprocessar e configurar notificações do evento.",
	},
	"team.manage": {
		label: "Gerenciar equipe",
		description: "Adicionar, remover e alterar permissões de membros.",
	},
};

const PERMISSION_SET = new Set<string>(PROJECT_PERMISSIONS);

export function isProjectPermission(
	value: unknown,
): value is ProjectPermission {
	return typeof value === "string" && PERMISSION_SET.has(value);
}

/** Remove duplicatas e valores desconhecidos de uma lista persistida. */
export function sanitizeProjectPermissions(
	value: readonly unknown[] | null | undefined,
): ProjectPermission[] {
	if (!Array.isArray(value)) return [];
	return [...new Set(value.filter(isProjectPermission))];
}

/**
 * Permissões efetivas de um membro. `overrides` (`null`/`undefined`) usa os
 * padrões do papel; um array — inclusive vazio — é a lista completa escolhida
 * pelo dono.
 */
export function resolveProjectPermissions(
	role: ProjectMemberRole,
	overrides?: readonly unknown[] | null,
): ProjectPermission[] {
	if (overrides != null) return sanitizeProjectPermissions(overrides);
	return [...PROJECT_ROLE_DEFAULTS[role]];
}

export function roleHasDefaultPermission(
	role: ProjectMemberRole,
	permission: ProjectPermission,
): boolean {
	return PROJECT_ROLE_DEFAULTS[role].includes(permission);
}

/** Permissões que o dono pode delegar (todas). */
export function allProjectPermissions(): ProjectPermission[] {
	return [...PROJECT_PERMISSIONS];
}
