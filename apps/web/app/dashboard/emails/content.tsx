"use client";

import { useEffect, useState } from "react";

import { keepPreviousData } from "@tanstack/react-query";
import {
	ChevronLeft,
	ChevronRight,
	Loader2,
	Mail,
	OctagonX,
	RefreshCw,
	Search,
	TriangleAlert,
	X,
} from "lucide-react";
import { toast } from "sonner";

import {
	NOTIFICATION_TYPE_LABELS,
	type NotificationListFilterInput,
} from "@verific/api/schemas";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	ConfirmDialog,
	useConfirmDialog,
} from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Empty } from "@/components/empty";

import { trpc } from "@/lib/trpc/react";

import { ErrorCell } from "./error-cell";
import { COUNTERS, SKIP_REASON_LABELS, STATUS_HELP, toIsoUtc } from "./helpers";

import type { EmailsListItem } from "./helpers";

type PageCursor = { createdAt: string; id: string };

const PAGE_SIZE = 20;

const FILTER_OPTIONS: Array<{
	value: NotificationListFilterInput;
	label: string;
}> = [
	{ value: "attention", label: "Precisam de atenção" },
	{ value: "all", label: "Todas" },
	{ value: "pending", label: "Pendentes" },
	{ value: "sending", label: "Enviando" },
	{ value: "stuck", label: "Travadas" },
	{ value: "sent", label: "Enviadas" },
	{ value: "failed", label: "Falhas" },
	{ value: "blocked_quota", label: "Bloqueadas (cota)" },
	{ value: "skipped", label: "Ignoradas" },
];

const DEFAULT_FILTER: NotificationListFilterInput = "attention";

function skipReasonLabel(reason: string): string {
	return SKIP_REASON_LABELS[reason] ?? reason;
}

function statusBadge(item: EmailsListItem) {
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

/**
 * Reprocessar só faz sentido para pendentes, falhas, cota e travadas.
 * Para os demais, a linha mostra um botão desabilitado com o motivo.
 */
function canReprocess(item: EmailsListItem): boolean {
	if (item.status === "sent") return false;
	if (item.status === "sending" && !item.stuck) return false;
	return true;
}

function reprocessDisabledReason(item: EmailsListItem): string {
	if (item.status === "sent") {
		return "Já enviada: este e-mail não é reenviado.";
	}
	return "Já está sendo enviada agora: aguarde o resultado.";
}

/** Timestamp no fuso do app (America/Sao_Paulo) + absoluto UTC no hover. */
function formatDateTime(value: string | Date): string {
	return new Date(value).toLocaleString("pt-BR", {
		timeZone: "America/Sao_Paulo",
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function Timestamp({ value }: { value: string | Date }) {
	return (
		<span
			className="cursor-help underline decoration-dotted underline-offset-2"
			title={`${toIsoUtc(value)} (UTC)`}
			// oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- horário só é acessível por teclado se o span puder receber foco para revelar o título.
			tabIndex={0}
			aria-label={`Horário absoluto: ${toIsoUtc(value)} (UTC)`}
		>
			{formatDateTime(value)}
		</span>
	);
}

interface RunProgress {
	active: boolean;
	processed: number;
	succeeded: number;
	failed: number;
	skipped: number;
}

export function EmailsContent() {
	const { projectId } = useDashboard();
	const utils = trpc.useUtils();
	const [filter, setFilter] =
		useState<NotificationListFilterInput>(DEFAULT_FILTER);
	const [cursorStack, setCursorStack] = useState<Array<PageCursor | null>>([
		null,
	]);
	const cursor = cursorStack[cursorStack.length - 1] ?? null;
	/** Valor digitado na busca; o filtro aplica depois do debounce. */
	const [searchInput, setSearchInput] = useState("");
	const [emailFilter, setEmailFilter] = useState("");
	const [reprocessingId, setReprocessingId] = useState<string | null>(null);
	const [runProgress, setRunProgress] = useState<RunProgress | null>(null);
	const { confirm: confirmRow, dialogProps: rowDialogProps } =
		useConfirmDialog();
	const { confirm: confirmRun, dialogProps: runDialogProps } =
		useConfirmDialog();

	// Busca por destinatário com debounce para não trocar a query a cada
	// tecla; reseta a paginação quando o filtro muda.
	useEffect(() => {
		const timeout = setTimeout(() => {
			setEmailFilter(searchInput.trim());
		}, 400);
		return () => clearTimeout(timeout);
	}, [searchInput]);

	const statsQuery = trpc.statsNotifications.useQuery(
		{ projectId },
		{ staleTime: 30 * 1000, refetchOnWindowFocus: false },
	);
	const listQuery = trpc.listNotifications.useQuery(
		{
			projectId,
			filter,
			email: emailFilter || undefined,
			cursor: cursor ?? undefined,
			limit: PAGE_SIZE,
		},
		{
			placeholderData: keepPreviousData,
			staleTime: 30 * 1000,
			refetchOnWindowFocus: false,
		},
	);

	const reprocessOneMutation = trpc.reprocessOneNotification.useMutation({
		onError: (error) => toast.error(error.message),
	});
	const reprocessBatchMutation =
		trpc.reprocessBatchNotifications.useMutation();

	async function refresh() {
		await Promise.all([
			utils.listNotifications.invalidate(),
			utils.statsNotifications.invalidate(),
		]);
	}

	function changeFilter(next: NotificationListFilterInput) {
		setFilter(next);
		setCursorStack([null]);
	}

	const usage = statsQuery.data?.usage;
	const counts = statsQuery.data?.counts;
	// Rows the batch run would actually attempt (sent + fresh sending are
	// skipped server-side, so they don't count here).
	const reprocessableCount = !counts
		? 0
		: filter === "attention"
			? counts.pending +
				counts.failed +
				counts.blocked_quota +
				counts.stuck
			: filter === "all"
				? counts.pending +
					counts.failed +
					counts.blocked_quota +
					counts.stuck +
					counts.skipped
				: filter === "sent" || filter === "sending"
					? 0
					: (counts[filter] ?? 0);
	const hasWorkToReprocess = statsQuery.data ? reprocessableCount > 0 : true;
	const overLimit = usage?.limit != null && usage.sentLast24h >= usage.limit;
	const usageRatio =
		usage?.limit != null && usage.limit > 0
			? usage.sentLast24h / usage.limit
			: 0;
	const usageTone =
		usage?.limit == null
			? "neutral"
			: usageRatio >= 1
				? "error"
				: usageRatio >= 0.8
					? "warning"
					: "neutral";

	async function handleReprocess(item: EmailsListItem) {
		if (!canReprocess(item) || reprocessingId) return;
		if (overLimit) {
			const ok = await confirmRow({
				title: "Excede o limite diário",
				description: `O uso já está em ${usage?.sentLast24h} de ${usage?.limit} envios nas últimas 24h. Reprocessar este e-mail ultrapassa o limite. Deseja enviar mesmo assim?`,
				confirmLabel: "Enviar mesmo assim",
			});
			if (!ok) return;
		}
		setReprocessingId(item.id);
		try {
			const { notification } = await reprocessOneMutation.mutateAsync({
				projectId,
				id: item.id,
			});
			await refresh();
			switch (notification?.status) {
				case "sent":
					toast.success("E-mail reprocessado e enviado.");
					break;
				case "pending":
				case "sending":
					toast.info("Reprocessamento em andamento.");
					break;
				case "skipped":
					toast.info(
						"E-mail ignorado: veja o motivo na linha referente a este e-mail.",
					);
					break;
				case "blocked_quota":
					toast.warning(
						"Reprocessado, mas o limite diário bloqueou o envio.",
					);
					break;
				default:
					toast.error(
						"Reprocessamento falhou: veja o erro na linha.",
					);
			}
		} catch {
			// Erro já exibido via onError do mutation.
		} finally {
			setReprocessingId(null);
		}
	}

	async function handleRunAll() {
		if (runProgress?.active) return;
		const ok = await confirmRun({
			title: "Reprocessar todos",
			description: `Serão tentados até ${reprocessableCount} e-mails do filtro atual. Uso atual: ${usage?.sentLast24h ?? 0}${usage?.limit != null ? ` de ${usage.limit}` : ""} nas últimas 24h. O processamento para ao atingir o limite.`,
			confirmLabel: "Reprocessar",
		});
		if (!ok) return;

		const progress: RunProgress = {
			active: true,
			processed: 0,
			succeeded: 0,
			failed: 0,
			skipped: 0,
		};
		setRunProgress({ ...progress });
		let nextCursor: PageCursor | null = null;
		let capReached = false;
		try {
			for (;;) {
				const result = await reprocessBatchMutation.mutateAsync({
					projectId,
					filter,
					cursor: nextCursor ?? undefined,
					limit: 20,
				});
				progress.processed += result.processed;
				progress.succeeded += result.succeeded;
				progress.failed += result.failed;
				progress.skipped += result.skipped;
				setRunProgress({ ...progress });
				capReached = result.capReached;
				if (!result.nextCursor || result.capReached) break;
				nextCursor = result.nextCursor;
			}
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Erro ao reprocessar e-mails",
			);
		} finally {
			setRunProgress({ ...progress, active: false });
		}
		await refresh();
		if (capReached) {
			toast.warning(
				"Limite diário atingido. Os e-mails restantes ficam para o próximo período.",
			);
		} else if (progress.processed > 0) {
			toast.success(
				`Reprocessamento concluído: ${progress.succeeded} enviados, ${progress.failed} falhas.`,
			);
		}
	}

	const items = listQuery.data?.items ?? [];
	const nextCursor = listQuery.data?.nextCursor ?? null;
	// O filtro está em um status de contador (não no padrão "attention"
	// nem no agregador "all")? Mostra a forma de limpar.
	const counterFilterActive =
		filter !== DEFAULT_FILTER &&
		COUNTERS.some((counter) => counter.key === filter);

	return (
		<div className="container-d py-container-v min-h-screen">
			<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-foreground text-2xl font-bold">
						E-mails
					</h1>
					<p className="text-muted-foreground text-sm">
						Notificações enviadas para os inscritos deste evento.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<div className="relative w-64 max-w-full">
						<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
						<Input
							className="pl-9"
							type="search"
							placeholder="Buscar por e-mail do destinatário"
							aria-label="Buscar por e-mail do destinatário"
							value={searchInput}
							onChange={(event) => {
								setSearchInput(event.target.value);
								setCursorStack([null]);
							}}
						/>
					</div>
					<Select
						value={filter}
						onValueChange={(value) =>
							changeFilter(value as NotificationListFilterInput)
						}
					>
						<SelectTrigger className="w-52">
							<SelectValue placeholder="Filtrar por status" />
						</SelectTrigger>
						<SelectContent>
							{FILTER_OPTIONS.map((option) => (
								<SelectItem
									key={option.value}
									value={option.value}
								>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="inline-flex">
								<Button
									onClick={() => void handleRunAll()}
									disabled={
										runProgress?.active ||
										listQuery.isPending ||
										statsQuery.isPending ||
										!hasWorkToReprocess
									}
								>
									{runProgress?.active ? (
										<Loader2
											className="animate-spin"
											aria-hidden
										/>
									) : (
										<RefreshCw />
									)}
									Reprocessar todos
								</Button>
							</span>
						</TooltipTrigger>
						<TooltipContent>
							{hasWorkToReprocess
								? "Reprocessa todos os e-mails do filtro atual"
								: "Nenhum e-mail para reprocessar neste filtro"}
						</TooltipContent>
					</Tooltip>
				</div>
			</div>

			<div className="mt-6">
				{statsQuery.isPending ? (
					<Skeleton className="h-20 w-full" />
				) : statsQuery.isError || !statsQuery.data ? (
					<Alert variant="destructive">
						<OctagonX />
						<AlertTitle>Erro ao carregar</AlertTitle>
						<AlertDescription>
							Não foi possível carregar o uso e as contagens.
							<Button
								variant="outline"
								size="sm"
								className="mt-2"
								onClick={() => {
									void statsQuery.refetch();
								}}
							>
								Tentar novamente
							</Button>
						</AlertDescription>
					</Alert>
				) : (
					<div className="flex flex-col gap-4">
						<TooltipProvider>
							<div
								className="flex flex-wrap items-center gap-2"
								role="group"
								aria-label="Contadores por status; clique para filtrar"
							>
								{COUNTERS.map((counter) => {
									const active = filter === counter.key;
									return (
										<Tooltip key={counter.key}>
											<TooltipTrigger asChild>
												<Button
													variant={
														active
															? "default"
															: "outline"
													}
													size="sm"
													aria-pressed={active}
													aria-label={`${counter.label}: ${statsQuery.data.counts[counter.key]}. ${counter.help}`}
													onClick={() =>
														changeFilter(
															active
																? DEFAULT_FILTER
																: counter.key,
														)
													}
												>
													{active ? (
														<X
															data-icon="inline-start"
															aria-hidden
														/>
													) : null}
													{counter.label}
													{active ? null : (
														<span className="text-muted-foreground ml-1 tabular-nums">
															{
																statsQuery.data
																	.counts[
																	counter.key
																]
															}
														</span>
													)}
												</Button>
											</TooltipTrigger>
											<TooltipContent className="max-w-72">
												{counter.help}
											</TooltipContent>
										</Tooltip>
									);
								})}
								{counterFilterActive ? (
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											changeFilter(DEFAULT_FILTER)
										}
									>
										<X />
										Limpar filtro
									</Button>
								) : null}
							</div>
						</TooltipProvider>
						<Alert
							variant={
								usageTone === "error"
									? "destructive"
									: "default"
							}
							className={
								usageTone === "warning"
									? "border-warning/30 bg-warning/5 [&>svg]:text-warning"
									: undefined
							}
						>
							{usageTone === "error" ? (
								<OctagonX />
							) : usageTone === "warning" ? (
								<TriangleAlert />
							) : (
								<Mail />
							)}
							<Tooltip>
								<TooltipTrigger asChild>
									<span
										className="cursor-help underline decoration-dotted underline-offset-2"
										aria-label="Cota diária de envios"
									>
										<AlertTitle>
											Enviados nas últimas 24h:{" "}
											{usage?.sentLast24h ?? 0}
											{usage?.limit != null
												? ` de ${usage.limit}`
												: ""}
										</AlertTitle>
									</span>
								</TooltipTrigger>
								<TooltipContent>
									Envios confirmados nas últimas 24 horas
									contra o teto diário do provedor; ao atingir
									o limite, novos envios aguardam o próximo
									período.
								</TooltipContent>
							</Tooltip>
							<AlertDescription>
								{usage?.limit == null
									? "Nenhum limite diário configurado."
									: usageTone === "error"
										? "Limite diário atingido. Novos reprocessamentos manuais pedem confirmação."
										: usageTone === "warning"
											? "Uso acima de 80% do limite diário."
											: "Dentro do limite diário."}
							</AlertDescription>
						</Alert>
					</div>
				)}
			</div>

			{runProgress?.active ? (
				<Alert className="mt-4">
					<Loader2 className="animate-spin" />
					<AlertTitle>Reprocessando e-mails…</AlertTitle>
					<AlertDescription>
						{runProgress.processed} processados ·{" "}
						{runProgress.succeeded} enviados · {runProgress.failed}{" "}
						falhas · {runProgress.skipped} ignorados
					</AlertDescription>
				</Alert>
			) : null}

			<div className="mt-6">
				{listQuery.isPending ? (
					<div className="space-y-2">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-64 w-full" />
					</div>
				) : listQuery.isError || !listQuery.data ? (
					<Alert variant="destructive">
						<OctagonX />
						<AlertTitle>Erro ao carregar</AlertTitle>
						<AlertDescription>
							Não foi possível carregar os e-mails. Tente
							recarregar a página.
							<Button
								variant="outline"
								size="sm"
								className="mt-2"
								onClick={() => {
									void listQuery.refetch();
								}}
							>
								Tentar novamente
							</Button>
						</AlertDescription>
					</Alert>
				) : items.length === 0 ? (
					<Empty
						title="Nenhum e-mail por aqui"
						description={
							emailFilter
								? `Nenhuma notificação para "${emailFilter}" neste filtro. Ajuste a busca ou limpe o filtro de status.`
								: "Nenhuma notificação encontrada para este filtro. Limpe a busca ou troque o filtro de status."
						}
					/>
				) : (
					<div className="max-h-[70vh] overflow-auto rounded-2xl border">
						<TooltipProvider>
							<Table>
								<TableHeader className="bg-card [&_th]:bg-card sticky top-0 z-10">
									<TableRow>
										<TableHead>Destinatário</TableHead>
										<TableHead>Tipo</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="text-right">
											Tentativas
										</TableHead>
										<TableHead>Erro / motivo</TableHead>
										<TableHead className="hidden md:table-cell">
											Provedor
										</TableHead>
										<TableHead className="hidden lg:table-cell">
											Criado em
										</TableHead>
										<TableHead className="hidden lg:table-cell">
											Atualizado em
										</TableHead>
										<TableHead className="text-right">
											Ações
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{items.map((item) => (
										<TableRow key={item.id}>
											<TableCell className="max-w-44 truncate font-medium">
												{item.recipientEmail}
											</TableCell>
											<TableCell>
												{NOTIFICATION_TYPE_LABELS[
													item.type as keyof typeof NOTIFICATION_TYPE_LABELS
												] ?? item.type}
											</TableCell>
											<TableCell>
												<Tooltip>
													<TooltipTrigger asChild>
														<span className="cursor-help">
															{statusBadge(item)}
														</span>
													</TooltipTrigger>
													<TooltipContent className="max-w-72">
														{
															STATUS_HELP[
																item.status ===
																"sending"
																	? item.stuck
																		? "stuck"
																		: "sending"
																	: item.status
															]
														}
													</TooltipContent>
												</Tooltip>
											</TableCell>
											<TableCell className="text-right tabular-nums">
												{item.attempts}
											</TableCell>
											<TableCell>
												{item.status === "skipped" &&
												item.skipReason &&
												!item.lastError ? (
													<Tooltip>
														<TooltipTrigger asChild>
															<span className="text-muted-foreground cursor-help underline decoration-dotted underline-offset-2">
																{skipReasonLabel(
																	item.skipReason,
																)}
															</span>
														</TooltipTrigger>
														<TooltipContent className="max-w-80 break-words">
															Motivo:{" "}
															{item.skipReason}
														</TooltipContent>
													</Tooltip>
												) : (
													<ErrorCell item={item} />
												)}
											</TableCell>
											<TableCell className="hidden md:table-cell">
												{item.provider ?? "—"}
											</TableCell>
											<TableCell className="hidden lg:table-cell">
												<Timestamp
													value={item.createdAt}
												/>
											</TableCell>
											<TableCell className="hidden lg:table-cell">
												<Timestamp
													value={item.updatedAt}
												/>
											</TableCell>
											<TableCell className="text-right">
												{canReprocess(item) ? (
													<Button
														variant="outline"
														size="sm"
														disabled={
															reprocessingId ===
															item.id
														}
														aria-label="Reprocessar este e-mail"
														onClick={() =>
															void handleReprocess(
																item,
															)
														}
													>
														{reprocessingId ===
														item.id ? (
															<Loader2
																className="animate-spin"
																aria-hidden
															/>
														) : (
															<RefreshCw />
														)}
														Reprocessar
													</Button>
												) : (
													<Tooltip>
														<TooltipTrigger asChild>
															<span className="inline-flex">
																<Button
																	variant="outline"
																	size="sm"
																	disabled
																	aria-label={`Reprocessar indisponível: ${reprocessDisabledReason(item)}`}
																>
																	<RefreshCw />
																	Reprocessar
																</Button>
															</span>
														</TooltipTrigger>
														<TooltipContent>
															{reprocessDisabledReason(
																item,
															)}
														</TooltipContent>
													</Tooltip>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TooltipProvider>
					</div>
				)}

				<div className="mt-4 flex items-center justify-between">
					<p className="text-muted-foreground text-xs">
						Página {cursorStack.length} · {items.length} e-mails
						{emailFilter ? ` · busca: ${emailFilter}` : ""}
					</p>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={
								cursorStack.length <= 1 || listQuery.isFetching
							}
							onClick={() =>
								setCursorStack((stack) => stack.slice(0, -1))
							}
						>
							<ChevronLeft />
							Anterior
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={!nextCursor || listQuery.isFetching}
							onClick={() => {
								if (nextCursor)
									setCursorStack((stack) => [
										...stack,
										nextCursor,
									]);
							}}
						>
							Próxima
							<ChevronRight />
						</Button>
					</div>
				</div>
			</div>

			<ConfirmDialog {...rowDialogProps} />
			<ConfirmDialog {...runDialogProps} />
		</div>
	);
}
