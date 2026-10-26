"use client";

import { useEffect, useRef, useState } from "react";

import { keepPreviousData } from "@tanstack/react-query";
import {
	ChevronLeft,
	ChevronRight,
	Info,
	Loader2,
	Mail,
	OctagonX,
	RefreshCw,
	RotateCw,
	Search,
	TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import {
	NOTIFICATION_TYPE_LABELS,
	type NotificationListFilterInput,
} from "@verific/api/schemas";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	ConfirmDialog,
	useConfirmDialog,
} from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
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

import { NotificationDetailSheet } from "./detail-sheet";
import { ErrorCell } from "./error-cell";
import {
	COUNTERS,
	SKIP_REASON_LABELS,
	canReprocess,
	reprocessDisabledReason,
	statusHelpOf,
	toIsoUtc,
} from "./helpers";
import { EmailsTableSkeleton, UsageBannerSkeleton } from "./skeleton";
import { StatusBadge } from "./status-badge";
import { StatusChip, COUNTER_VARIANT } from "./status-chip";

import type { EmailsListItem } from "./helpers";

type PageCursor = { createdAt: string; id: string };

const PAGE_SIZE = 20;
/** Espera mínima entre recarregamentos manuais (evita spam no backend). */
const RELOAD_DEBOUNCE_MS = 3000;

/** Cor do preenchimento da barra de uso por tom. */
const USAGE_BAR: Record<"neutral" | "warning" | "error", string> = {
	neutral: "bg-brand-500",
	warning: "bg-yellow-400",
	error: "bg-red-500",
};

const DEFAULT_FILTER: NotificationListFilterInput = "attention";

function skipReasonLabel(reason: string): string {
	return SKIP_REASON_LABELS[reason] ?? reason;
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
			className="cursor-help whitespace-nowrap underline decoration-dotted underline-offset-2"
			title={`${toIsoUtc(value)} (UTC)`}
			// oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- horário só é acessível por teclado se o span puder receber foco para revelar o título.
			tabIndex={0}
			aria-label={`Horário absoluto: ${toIsoUtc(value)} (UTC)`}
		>
			{formatDateTime(value)}
		</span>
	);
}

interface SegmentButtonProps {
	label: string;
	help: string;
	active: boolean;
	count?: number;
	onClick: () => void;
}

/** Botão do controle segmentado de visões agregadas. */
function SegmentButton({
	label,
	help,
	active,
	count,
	onClick,
}: SegmentButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-pressed={active}
					aria-label={`${label}${count != null ? `: ${count}` : ""}. ${help}`}
					onClick={onClick}
					className={`focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none ${
						active
							? "bg-background text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					{label}
					{count != null ? (
						<span className="text-muted-foreground text-xs tabular-nums">
							{count}
						</span>
					) : null}
				</button>
			</TooltipTrigger>
			<TooltipContent side="bottom" className="max-w-64">
				{help}
			</TooltipContent>
		</Tooltip>
	);
}

interface RunProgress {
	active: boolean;
	mode: "all" | "selected";
	processed: number;
	succeeded: number;
	failed: number;
	skipped: number;
}

/** Classifica o resultado de um reprocessamento individual para o resumo. */
function classifyOutcome(
	status: string | undefined,
): keyof Pick<RunProgress, "succeeded" | "failed" | "skipped"> {
	if (status === "sent") return "succeeded";
	if (status === "pending" || status === "sending" || status === "skipped")
		return "skipped";
	return "failed";
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
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [detailId, setDetailId] = useState<string | null>(null);
	const [reloadCoolingDown, setReloadCoolingDown] = useState(false);
	const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

	useEffect(
		() => () => {
			if (reloadTimer.current) clearTimeout(reloadTimer.current);
		},
		[],
	);

	const statsQuery = trpc.statsNotifications.useQuery(
		{ projectId },
		{
			staleTime: 2 * 60 * 1000,
			refetchOnWindowFocus: false,
		},
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
			staleTime: 2 * 60 * 1000,
			refetchOnWindowFocus: false,
		},
	);

	const reprocessOneMutation = trpc.reprocessOneNotification.useMutation({
		onError: (error) => toast.error(error.message),
	});
	// Variante silenciosa para o lote: um toast por linha viraria ruído.
	const reprocessOneSilent = trpc.reprocessOneNotification.useMutation();
	const reprocessBatchMutation =
		trpc.reprocessBatchNotifications.useMutation();

	async function refresh() {
		await Promise.all([
			utils.listNotifications.invalidate(),
			utils.statsNotifications.invalidate(),
		]);
	}

	/** Recarrega com espera embutida, para cliques repetidos não irem ao ar. */
	async function handleReload() {
		if (reloadCoolingDown) return;
		setReloadCoolingDown(true);
		try {
			await refresh();
		} finally {
			if (reloadTimer.current) clearTimeout(reloadTimer.current);
			reloadTimer.current = setTimeout(
				() => setReloadCoolingDown(false),
				RELOAD_DEBOUNCE_MS,
			);
		}
	}

	function changeFilter(next: NotificationListFilterInput) {
		setFilter(next);
		setCursorStack([null]);
		// Trocar filtro/busca/página invalida a seleção (as linhas somem).
		setSelectedIds(new Set());
	}

	const usage = statsQuery.data?.usage;
	const counts = statsQuery.data?.counts;
	// Linhas que "Precisam de atenção" (mesma soma usada pelo reprocessamento).
	const attentionCount = counts
		? counts.pending + counts.failed + counts.blocked_quota + counts.stuck
		: undefined;
	// Rows the batch run would actually attempt (sent + fresh sending are
	// skipped server-side, so they don't count here).
	const reprocessableCount = !counts
		? 0
		: filter === "attention"
			? (attentionCount ?? 0)
			: filter === "all"
				? (attentionCount ?? 0) + counts.skipped
				: filter === "sent" || filter === "sending"
					? 0
					: (counts[filter] ?? 0);
	const hasWorkToReprocess = statsQuery.data ? reprocessableCount > 0 : true;
	const overLimit = usage?.limit != null && usage.sentLast24h >= usage.limit;
	const usageRatio =
		usage?.limit != null && usage.limit > 0
			? usage.sentLast24h / usage.limit
			: 0;
	const usageTone: "neutral" | "warning" | "error" =
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
			mode: "all",
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

	/** Reprocessa exatamente as linhas marcadas, uma a uma (sem spam). */
	async function handleReprocessSelected() {
		const ids = [...selectedIds];
		if (ids.length === 0 || runProgress?.active) return;
		const ok = await confirmRun({
			title: "Reprocessar selecionados",
			description: `Serão tentados ${ids.length} e-mail(is) selecionado(s). Uso atual: ${usage?.sentLast24h ?? 0}${usage?.limit != null ? ` de ${usage.limit}` : ""} nas últimas 24h. O processamento para ao atingir o limite.`,
			confirmLabel: "Reprocessar",
		});
		if (!ok) return;

		const progress: RunProgress = {
			active: true,
			mode: "selected",
			processed: 0,
			succeeded: 0,
			failed: 0,
			skipped: 0,
		};
		setRunProgress({ ...progress });
		for (const id of ids) {
			try {
				const { notification } = await reprocessOneSilent.mutateAsync({
					projectId,
					id,
				});
				progress.processed += 1;
				const outcome = classifyOutcome(notification?.status);
				if (outcome === "succeeded") progress.succeeded += 1;
				else if (outcome === "skipped") progress.skipped += 1;
				else progress.failed += 1;
			} catch {
				progress.processed += 1;
				progress.failed += 1;
			}
			setRunProgress({ ...progress });
		}
		setRunProgress({ ...progress, active: false });
		setSelectedIds(new Set());
		await refresh();
		toast.success(
			`Reprocessamento concluído: ${progress.succeeded} enviados, ${progress.failed} falhas, ${progress.skipped} ignorados.`,
		);
	}

	const items = listQuery.data?.items ?? [];
	const nextCursor = listQuery.data?.nextCursor ?? null;
	// Deriva o item da lista atual para a gaveta refletir recarregamentos.
	const detailItem = detailId
		? (items.find((item) => item.id === detailId) ?? null)
		: null;

	const selectableItems = items.filter(canReprocess);
	const allSelected =
		selectableItems.length > 0 &&
		selectableItems.every((item) => selectedIds.has(item.id));
	const someSelected = selectableItems.some((item) =>
		selectedIds.has(item.id),
	);
	const headerChecked: boolean | "indeterminate" = allSelected
		? true
		: someSelected
			? "indeterminate"
			: false;

	function toggleOne(id: string) {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleAll() {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (allSelected) {
				for (const item of selectableItems) next.delete(item.id);
			} else {
				for (const item of selectableItems) next.add(item.id);
			}
			return next;
		});
	}

	return (
		<TooltipProvider delayDuration={200}>
			<div className="container-d py-container-v flex min-h-[calc(100dvh-var(--dashboard-header-height))] flex-col gap-6">
				{/* Linha 1 — Cabeçalho: título à esquerda, ações à direita */}
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0">
						<h1 className="text-foreground text-2xl font-bold tracking-tight">
							E-mails
						</h1>
						<p className="text-muted-foreground text-sm">
							Notificações enviadas para os inscritos deste
							evento.
						</p>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="inline-flex">
									<Button
										variant="outline"
										size="icon"
										aria-label="Recarregar lista e contagens"
										disabled={
											reloadCoolingDown ||
											listQuery.isFetching ||
											statsQuery.isPending
										}
										onClick={() => void handleReload()}
									>
										<RotateCw
											className={
												listQuery.isFetching
													? "animate-spin"
													: undefined
											}
										/>
									</Button>
								</span>
							</TooltipTrigger>
							<TooltipContent
								side="bottom"
								align="end"
								className="max-w-64"
							>
								{reloadCoolingDown
									? "Aguarde um instante antes de recarregar de novo"
									: "Atualiza lista e contagens"}
							</TooltipContent>
						</Tooltip>
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
										{runProgress?.active &&
										runProgress.mode === "all" ? (
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
							<TooltipContent side="bottom" align="end">
								{hasWorkToReprocess
									? "Reprocessa todos os e-mails do filtro atual"
									: "Nenhum e-mail para reprocessar neste filtro"}
							</TooltipContent>
						</Tooltip>
					</div>
				</div>

				{/* Linha 2 — Caixa de uso da cota: sempre visível, com barra de progresso */}
				<div>
					{statsQuery.isPending ? (
						<UsageBannerSkeleton />
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
						<Alert
							variant={
								usageTone === "error"
									? "destructive"
									: "default"
							}
							className={`${
								usage?.limit != null ? "sm:pr-80" : ""
							} ${
								usageTone === "warning"
									? "border-warning/30 bg-warning/5 [&>svg]:text-warning"
									: ""
							}`}
						>
							{usageTone === "error" ? (
								<OctagonX />
							) : usageTone === "warning" ? (
								<TriangleAlert />
							) : (
								<Mail />
							)}
							<AlertTitle className="flex items-center gap-1.5">
								<span>
									Enviados nas últimas 24h:{" "}
									<span className="tabular-nums">
										{usage?.sentLast24h ?? 0}
									</span>
									{usage?.limit != null
										? ` de ${usage.limit}`
										: ""}
								</span>
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-4 shrink-0 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
											aria-label="Sobre a cota diária de envios"
										>
											<Info className="size-3.5" />
										</button>
									</TooltipTrigger>
									<TooltipContent
										side="bottom"
										align="start"
										className="max-w-72"
									>
										Envios confirmados nas últimas 24 horas
										contra o teto diário do provedor; ao
										atingir o limite, novos envios aguardam
										o próximo período.
									</TooltipContent>
								</Tooltip>
							</AlertTitle>
							<AlertDescription>
								{usage?.limit == null
									? "Nenhum limite diário configurado."
									: usageTone === "error"
										? "Limite diário atingido. Novos reprocessamentos manuais pedem confirmação."
										: usageTone === "warning"
											? "Uso acima de 80% do limite diário."
											: "Dentro do limite diário."}
							</AlertDescription>
							{usage?.limit != null ? (
								<div
									role="progressbar"
									aria-label="Uso da cota diária"
									aria-valuemin={0}
									aria-valuemax={usage.limit}
									aria-valuenow={usage.sentLast24h}
									className="bg-border col-start-2 mt-3 h-1.5 w-full overflow-hidden rounded-full sm:absolute sm:top-1/2 sm:right-4 sm:mt-0 sm:w-64 sm:-translate-y-1/2"
								>
									<div
										className={`h-full rounded-full ${USAGE_BAR[usageTone]}`}
										style={{
											width: `${Math.min(100, usageRatio * 100)}%`,
										}}
									/>
								</div>
							) : null}
						</Alert>
					)}
				</div>

				{/* Linhas 3 e 4 — Filtros: busca + visões; depois status */}
				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="relative w-full sm:max-w-sm">
							<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
							<Input
								className="w-full pl-9"
								type="search"
								placeholder="Buscar por destinatário"
								aria-label="Buscar por e-mail do destinatário"
								value={searchInput}
								onChange={(event) => {
									setSearchInput(event.target.value);
									setCursorStack([null]);
									setSelectedIds(new Set());
								}}
							/>
						</div>
						<div
							role="group"
							aria-label="Visão da lista"
							className="bg-muted inline-flex w-fit shrink-0 rounded-lg border p-0.5"
						>
							<SegmentButton
								label="Precisam de atenção"
								help="Pendentes, falhas, bloqueadas por cota e travadas."
								active={filter === "attention"}
								count={attentionCount}
								onClick={() => changeFilter("attention")}
							/>
							<SegmentButton
								label="Todas"
								help="Todas as notificações, de qualquer status."
								active={filter === "all"}
								onClick={() => changeFilter("all")}
							/>
						</div>
					</div>
					<div
						className="flex flex-wrap items-center gap-2"
						role="group"
						aria-label="Filtrar por status"
					>
						<span className="text-muted-foreground mr-1 text-xs font-medium">
							Status
						</span>
						{COUNTERS.map((counter) => {
							const active = filter === counter.key;
							return (
								<StatusChip
									key={counter.key}
									label={counter.label}
									help={counter.help}
									active={active}
									count={counts?.[counter.key]}
									variant={
										COUNTER_VARIANT[
											counter.key as string
										] ?? "secondary"
									}
									onClick={() =>
										changeFilter(
											active
												? DEFAULT_FILTER
												: counter.key,
										)
									}
								/>
							);
						})}
					</div>
				</div>

				{runProgress?.active ? (
					<Alert>
						<Loader2 className="animate-spin" />
						<AlertTitle>
							{runProgress.mode === "selected"
								? "Reprocessando selecionados…"
								: "Reprocessando e-mails…"}
						</AlertTitle>
						<AlertDescription>
							{runProgress.processed} processados ·{" "}
							{runProgress.succeeded} enviados ·{" "}
							{runProgress.failed} falhas · {runProgress.skipped}{" "}
							ignorados
						</AlertDescription>
					</Alert>
				) : null}

				<div>
					{listQuery.isPending ? (
						<EmailsTableSkeleton />
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
						<div className="flex flex-col gap-3">
							<div className="max-h-[70vh] overflow-auto rounded-lg border">
								<Table className="min-w-[880px] [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle [&_th]:px-3">
									<TableHeader className="bg-card [&_th]:bg-card sticky top-0 z-10 [&_th]:whitespace-nowrap">
										<TableRow>
											<TableHead className="w-10">
												<Checkbox
													checked={headerChecked}
													onCheckedChange={toggleAll}
													disabled={
														selectableItems.length ===
														0
													}
													aria-label="Selecionar e-mails reprocessáveis desta página"
												/>
											</TableHead>
											<TableHead>Destinatário</TableHead>
											<TableHead>Tipo</TableHead>
											<TableHead>Status</TableHead>
											<TableHead className="text-center">
												Tentativas
											</TableHead>
											<TableHead className="w-full min-w-64">
												Erro / motivo
											</TableHead>
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
												<TableCell>
													<Checkbox
														checked={selectedIds.has(
															item.id,
														)}
														onCheckedChange={() =>
															toggleOne(item.id)
														}
														disabled={
															!canReprocess(item)
														}
														aria-label={
															canReprocess(item)
																? `Selecionar ${item.recipientEmail}`
																: `Não selecionável: ${reprocessDisabledReason(item)}`
														}
													/>
												</TableCell>
												<TableCell
													className="max-w-64 truncate font-medium"
													title={item.recipientEmail}
												>
													{item.recipientEmail}
												</TableCell>
												<TableCell className="whitespace-nowrap">
													{NOTIFICATION_TYPE_LABELS[
														item.type as keyof typeof NOTIFICATION_TYPE_LABELS
													] ?? item.type}
												</TableCell>
												<TableCell className="whitespace-nowrap">
													<Tooltip>
														<TooltipTrigger asChild>
															<span className="inline-flex cursor-help">
																<StatusBadge
																	item={item}
																/>
															</span>
														</TooltipTrigger>
														<TooltipContent
															side="top"
															className="max-w-72"
														>
															{statusHelpOf(item)}
														</TooltipContent>
													</Tooltip>
												</TableCell>
												<TableCell className="text-center tabular-nums">
													{item.attempts}
												</TableCell>
												<TableCell className="w-full max-w-0 min-w-64">
													{item.status ===
														"skipped" &&
													item.skipReason &&
													!item.lastError ? (
														<Tooltip>
															<TooltipTrigger
																asChild
															>
																<span className="text-muted-foreground block cursor-help truncate underline decoration-dotted underline-offset-2">
																	{skipReasonLabel(
																		item.skipReason,
																	)}
																</span>
															</TooltipTrigger>
															<TooltipContent
																side="top"
																align="start"
																className="max-w-80 break-words"
															>
																Motivo:{" "}
																{
																	item.skipReason
																}
															</TooltipContent>
														</Tooltip>
													) : (
														<ErrorCell
															item={item}
														/>
													)}
												</TableCell>
												<TableCell className="hidden whitespace-nowrap md:table-cell">
													{item.provider ?? "—"}
												</TableCell>
												<TableCell className="hidden whitespace-nowrap lg:table-cell">
													<Timestamp
														value={item.createdAt}
													/>
												</TableCell>
												<TableCell className="hidden whitespace-nowrap lg:table-cell">
													<Timestamp
														value={item.updatedAt}
													/>
												</TableCell>
												<TableCell className="text-right whitespace-nowrap">
													<div className="flex items-center justify-end gap-1">
														<Button
															variant="ghost"
															size="icon-sm"
															aria-label="Ver detalhes"
															onClick={() =>
																setDetailId(
																	item.id,
																)
															}
														>
															<Info />
														</Button>
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
																	<Loader2 className="animate-spin" />
																) : (
																	<RefreshCw />
																)}
																Reprocessar
															</Button>
														) : (
															<Tooltip>
																<TooltipTrigger
																	asChild
																>
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
																<TooltipContent
																	side="left"
																	className="max-w-64"
																>
																	{reprocessDisabledReason(
																		item,
																	)}
																</TooltipContent>
															</Tooltip>
														)}
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{selectedIds.size > 0 ? (
								<div className="bg-muted/40 flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
									<p className="text-sm">
										{selectedIds.size} selecionado
										{selectedIds.size > 1 ? "s" : ""}
									</p>
									<div className="flex flex-wrap gap-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={() =>
												setSelectedIds(new Set())
											}
										>
											Limpar seleção
										</Button>
										<Button
											size="sm"
											disabled={runProgress?.active}
											onClick={() =>
												void handleReprocessSelected()
											}
										>
											{runProgress?.active &&
											runProgress.mode === "selected" ? (
												<Loader2 className="animate-spin" />
											) : (
												<RefreshCw />
											)}
											Reprocessar selecionados
										</Button>
									</div>
								</div>
							) : null}
						</div>
					)}

					<div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-muted-foreground min-w-0 text-xs break-words">
							Página {cursorStack.length} · {items.length} e-mails
							{emailFilter ? ` · busca: ${emailFilter}` : ""}
						</p>
						<div className="flex shrink-0 gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={
									cursorStack.length <= 1 ||
									listQuery.isFetching
								}
								onClick={() => {
									setSelectedIds(new Set());
									setCursorStack((stack) =>
										stack.slice(0, -1),
									);
								}}
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
									setSelectedIds(new Set());
								}}
							>
								Próxima
								<ChevronRight />
							</Button>
						</div>
					</div>
				</div>

				<NotificationDetailSheet
					item={detailItem}
					onOpenChange={(open) => {
						if (!open) setDetailId(null);
					}}
					onReprocess={(item) => {
						setDetailId(null);
						void handleReprocess(item);
					}}
					canReprocess={detailItem ? canReprocess(detailItem) : false}
					disabledReason={
						detailItem ? reprocessDisabledReason(detailItem) : ""
					}
					reprocessing={
						detailItem != null && reprocessingId === detailItem.id
					}
				/>

				<ConfirmDialog {...rowDialogProps} />
				<ConfirmDialog {...runDialogProps} />
			</div>
		</TooltipProvider>
	);
}
