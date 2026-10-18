import { Badge } from "@/components/ui/badge";

import type { EmailsListItem } from "./helpers";

/** Selo de status com o rótulo e a cor canônicos da página de e-mails. */
export function StatusBadge({ item }: { item: EmailsListItem }) {
	if (item.status === "skipped")
		return <Badge variant="outline">Ignorada</Badge>;
	if (item.status === "failed")
		return <Badge variant="destructive">Falhou</Badge>;
	if (item.status === "blocked_quota")
		return <Badge variant="warning">Cota excedida</Badge>;
	if (item.status === "sending" && item.stuck)
		return <Badge variant="warning">Travada</Badge>;
	if (item.status === "sending")
		return <Badge variant="info">Enviando</Badge>;
	if (item.status === "sent") return <Badge variant="success">Enviada</Badge>;
	return <Badge variant="secondary">Pendente</Badge>;
}
