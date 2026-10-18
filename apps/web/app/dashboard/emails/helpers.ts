import type { RouterOutput } from "@verific/api";

export type EmailsListItem = RouterOutput["listNotifications"]["items"][number];

/** Máscara parcial: `ab***@ic.ufal.br`. Nunca expõe o e-mail completo. */
export function maskEmail(email: string): string {
	const at = email.indexOf("@");
	if (at <= 0) return "***";
	const local = email.slice(0, at);
	const domain = email.slice(at + 1);
	if (!domain) return "***";
	return `${local.slice(0, 2)}***@${domain}`;
}

export const STATUS_LABELS: Record<string, string> = {
	pending: "Pendente",
	sending: "Enviando",
	stuck: "Travada",
	sent: "Enviada",
	failed: "Falhou",
	blocked_quota: "Cota excedida",
	skipped: "Ignorada",
};

export const SKIP_REASON_LABELS: Record<string, string> = {
	disabled_by_event: "Desativado nas configurações do evento",
	entity_gone: "Registro não existe mais",
	state_changed: "Estado mudou antes do envio",
	unsupported_type: "Tipo de notificação não suportado",
};

export function statusLabelOf(item: {
	status: string;
	stuck: boolean;
}): string {
	if (item.status === "sending") return item.stuck ? "Travada" : "Enviando";
	return STATUS_LABELS[item.status] ?? item.status;
}

/**
 * Texto de erro copiável: o erro armazenado, ou o motivo do skip quando
 * não houve erro.
 */
export function errorTextOf(item: {
	lastError: string | null;
	skipReason: string | null;
}): string {
	if (item.lastError) return item.lastError;
	if (item.skipReason) {
		return `skip: ${
			SKIP_REASON_LABELS[item.skipReason] ?? item.skipReason
		}`;
	}
	return "—";
}

/** Timestamp ISO em UTC com soma de fuso, para diagnóstico e hover. */
export function toIsoUtc(value: string | Date): string {
	return new Date(value).toISOString();
}

/**
 * Bloco de texto plano para "Copiar diagnóstico". Só contém dados
 * seguros: ids, status, timestamps, e-mail mascarado e entityRefs.
 * Nunca inclui tokens, chaves ou strings de conexão.
 */
export function buildDiagnostic(item: EmailsListItem): string {
	return [
		`id: ${item.id}`,
		`tipo: ${item.type}`,
		`status: ${statusLabelOf(item)}`,
		`tentativas: ${item.attempts}`,
		`provedor: ${item.provider ?? "—"}`,
		`criado em (UTC): ${toIsoUtc(item.createdAt)}`,
		`atualizado em (UTC): ${toIsoUtc(item.updatedAt)}`,
		`destinatário: ${maskEmail(item.recipientEmail)}`,
		`erro: ${errorTextOf(item)}`,
		`entityRefs: ${JSON.stringify(item.entityRefs)}`,
	].join("\n");
}

/**
 * Copia texto para a área de transferência com fallback para
 * `document.execCommand` em ambientes sem Clipboard API. Retorna falso
 * quando nenhuma via funciona (a UI avisa com toast).
 */
export async function copyText(text: string): Promise<boolean> {
	try {
		if (typeof navigator !== "undefined" && navigator?.clipboard) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// cai para o fallback abaixo
	}
	try {
		const textarea = document.createElement("textarea");
		textarea.value = text;
		textarea.setAttribute("readonly", "");
		textarea.style.position = "fixed";
		textarea.style.opacity = "0";
		document.body.appendChild(textarea);
		textarea.select();
		const ok = document.execCommand("copy");
		document.body.removeChild(textarea);
		return ok;
	} catch {
		return false;
	}
}

/** Ajuda de uma frase por status: o que significa e o que fazer. */
export const STATUS_HELP = {
	pending:
		"Na fila aguardando envio (ou o limite diário parou o lote). Use Reprocessar para tentar agora.",
	sending:
		"Em processamento neste momento. Aguarde; não é possível reprocessar.",
	stuck: "O envio iniciou há mais de 10 min e não terminou (processo morto). Use Reprocessar para retomar.",
	sent: "Confirmado pelo provedor de e-mail. Nunca é reenviado.",
	failed: "Erro permanente após as tentativas. Copie o erro, corrija a causa e use Reprocessar.",
	blocked_quota:
		"Parado pelo limite diário de envios. Volta sozinho em até 24h ou use Reprocessar quando houver cota.",
	skipped:
		"Registrado, mas sem envio previsto (desativado ou estado mudou). Veja o motivo na linha.",
} as const satisfies Record<string, string>;

export const COUNTERS: Array<{
	key:
		| "pending"
		| "sending"
		| "stuck"
		| "sent"
		| "failed"
		| "blocked_quota"
		| "skipped";
	label: string;
	help: string;
	variant:
		| "secondary"
		| "info"
		| "warning"
		| "success"
		| "destructive"
		| "outline";
}> = [
	{
		key: "pending",
		label: "Pendentes",
		help: STATUS_HELP.pending,
		variant: "secondary",
	},
	{
		key: "sending",
		label: "Enviando",
		help: STATUS_HELP.sending,
		variant: "info",
	},
	{
		key: "stuck",
		label: "Travadas",
		help: STATUS_HELP.stuck,
		variant: "warning",
	},
	{
		key: "sent",
		label: "Enviadas",
		help: STATUS_HELP.sent,
		variant: "success",
	},
	{
		key: "failed",
		label: "Falhas",
		help: STATUS_HELP.failed,
		variant: "destructive",
	},
	{
		key: "blocked_quota",
		label: "Cota",
		help: STATUS_HELP.blocked_quota,
		variant: "outline",
	},
	{
		key: "skipped",
		label: "Ignoradas",
		help: STATUS_HELP.skipped,
		variant: "outline",
	},
];
