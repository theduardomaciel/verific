"use client";

import { Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { NOTIFICATION_TYPE_LABELS } from "@verific/api/schemas";
import { formatInstant } from "@verific/drizzle/time";

import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

import { useEventTimeZone } from "@/components/event-time-zone";

import {
	SKIP_REASON_LABELS,
	buildDiagnostic,
	copyText,
	errorTextOf,
	statusHelpOf,
	toIsoUtc,
} from "./helpers";
import { StatusBadge } from "./status-badge";

import type { EmailsListItem } from "./helpers";

function AbsoluteTime({ value }: { value: string | Date }) {
	const timeZone = useEventTimeZone();
	return (
		<span className="flex flex-col">
			<span>
				{formatInstant(value, timeZone, {
					dateStyle: "short",
					timeStyle: "short",
				})}
			</span>
			<span className="text-muted-foreground font-mono text-xs">
				{toIsoUtc(value)} (UTC)
			</span>
		</span>
	);
}

function CopyButton({ value, label }: { value: string; label: string }) {
	return (
		<Button
			variant="ghost"
			size="icon-sm"
			aria-label={`Copiar ${label}`}
			onClick={() => void copyValue(value, label)}
		>
			<Copy />
		</Button>
	);
}

async function copyValue(value: string, label: string) {
	const ok = await copyText(value);
	if (ok) toast.success(`${label} copiado para a área de transferência`);
	else toast.error("Não foi possível copiar. Selecione o texto manualmente.");
}

/**
 * Gaveta lateral com os detalhes de uma notificação: ids, tempos, erro
 * completo e entityRefs, com as mesmas ações de copiar/reprocessar da linha.
 */
export function NotificationDetailSheet({
	item,
	onOpenChange,
	onReprocess,
	canReprocess,
	disabledReason,
	reprocessing,
}: {
	item: EmailsListItem | null;
	onOpenChange: (open: boolean) => void;
	onReprocess: (item: EmailsListItem) => void;
	canReprocess: boolean;
	disabledReason: string;
	reprocessing: boolean;
}) {
	const typeLabel = item
		? (NOTIFICATION_TYPE_LABELS[
				item.type as keyof typeof NOTIFICATION_TYPE_LABELS
			] ?? item.type)
		: "";

	return (
		<Sheet open={item != null} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full gap-0 overflow-y-auto sm:max-w-md"
			>
				{item ? (
					<>
						<SheetHeader className="border-b">
							<SheetTitle>Detalhes da notificação</SheetTitle>
							<SheetDescription className="break-all">
								{item.recipientEmail}
							</SheetDescription>
						</SheetHeader>

						<div className="flex flex-col gap-5 p-4">
							<dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-3 text-sm">
								<dt className="text-muted-foreground">
									Status
								</dt>
								<dd className="flex flex-col gap-0.5">
									<StatusBadge item={item} />
									<span className="text-muted-foreground text-xs">
										{statusHelpOf(item)}
									</span>
								</dd>

								<dt className="text-muted-foreground">Tipo</dt>
								<dd className="flex flex-col">
									<span>{typeLabel}</span>
									<span className="text-muted-foreground font-mono text-xs">
										{item.type}
									</span>
								</dd>

								<dt className="text-muted-foreground">ID</dt>
								<dd className="flex items-center gap-1">
									<span className="font-mono text-xs break-all">
										{item.id}
									</span>
									<CopyButton value={item.id} label="ID" />
								</dd>

								<dt className="text-muted-foreground">
									Tentativas
								</dt>
								<dd className="tabular-nums">
									{item.attempts}
								</dd>

								<dt className="text-muted-foreground">
									Provedor
								</dt>
								<dd className="break-all">
									{item.provider ?? "—"}
									{item.providerMessageId
										? ` · ${item.providerMessageId}`
										: ""}
								</dd>

								<dt className="text-muted-foreground">
									Assunto
								</dt>
								<dd>{item.subject ?? "—"}</dd>

								<dt className="text-muted-foreground">
									Template
								</dt>
								<dd>{item.templateVersion ?? "—"}</dd>

								<dt className="text-muted-foreground">
									Criado em
								</dt>
								<dd>
									<AbsoluteTime value={item.createdAt} />
								</dd>

								<dt className="text-muted-foreground">
									Atualizado em
								</dt>
								<dd>
									<AbsoluteTime value={item.updatedAt} />
								</dd>

								<dt className="text-muted-foreground">
									Enviado em
								</dt>
								<dd>
									{item.sentAt ? (
										<AbsoluteTime value={item.sentAt} />
									) : (
										"—"
									)}
								</dd>

								<dt className="text-muted-foreground">
									propsHash
								</dt>
								<dd className="font-mono text-xs break-all">
									{item.propsHash ?? "—"}
								</dd>

								{item.skipReason ? (
									<>
										<dt className="text-muted-foreground">
											Motivo do skip
										</dt>
										<dd className="flex flex-col">
											<span>
												{SKIP_REASON_LABELS[
													item.skipReason
												] ?? item.skipReason}
											</span>
											<span className="text-muted-foreground font-mono text-xs">
												{item.skipReason}
											</span>
										</dd>
									</>
								) : null}
							</dl>

							{errorTextOf(item) !== "—" ? (
								<section className="space-y-2">
									<div className="flex items-center justify-between">
										<h3 className="text-sm font-medium">
											Erro
										</h3>
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												void copyValue(
													errorTextOf(item),
													"Erro",
												)
											}
										>
											<Copy />
											Copiar erro
										</Button>
									</div>
									<pre className="bg-muted/40 max-h-48 overflow-auto rounded-md border p-2 font-mono text-xs break-all whitespace-pre-wrap">
										{errorTextOf(item)}
									</pre>
								</section>
							) : null}

							<section className="space-y-2">
								<div className="flex items-center justify-between">
									<h3 className="text-sm font-medium">
										entityRefs
									</h3>
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											void copyValue(
												JSON.stringify(
													item.entityRefs,
													null,
													2,
												),
												"entityRefs",
											)
										}
									>
										<Copy />
										Copiar JSON
									</Button>
								</div>
								<pre className="bg-muted/40 overflow-auto rounded-md border p-2 font-mono text-xs break-all whitespace-pre-wrap">
									{JSON.stringify(item.entityRefs, null, 2)}
								</pre>
							</section>

							<div className="flex flex-wrap gap-2 border-t pt-4">
								<Button
									variant="outline"
									onClick={() =>
										void copyValue(
											buildDiagnostic(item),
											"Diagnóstico",
										)
									}
								>
									<Copy />
									Copiar diagnóstico
								</Button>
								{canReprocess ? (
									<Button
										disabled={reprocessing}
										onClick={() => onReprocess(item)}
									>
										{reprocessing ? (
											<Loader2 className="animate-spin" />
										) : (
											<RefreshCw />
										)}
										Reprocessar
									</Button>
								) : (
									<Tooltip>
										<TooltipTrigger asChild>
											<span className="inline-flex">
												<Button disabled>
													<RefreshCw />
													Reprocessar
												</Button>
											</span>
										</TooltipTrigger>
										<TooltipContent>
											{disabledReason}
										</TooltipContent>
									</Tooltip>
								)}
							</div>
						</div>
					</>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
