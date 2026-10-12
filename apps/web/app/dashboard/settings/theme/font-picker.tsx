"use client";

import * as React from "react";

import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
	AlertTriangle,
	Check,
	ChevronsUpDown,
	Italic,
	Loader2,
	Minus,
	Plus,
	RotateCcw,
} from "lucide-react";

import type { ThemeFontSelection } from "@verific/drizzle/theme";
import {
	FONT_CATEGORIES,
	hasLatinExt,
	SCALE_LIMITS,
	buildSizeAdjust,
} from "@verific/fonts";
import type { FontCatalogEntry, FontCategory, FontRole } from "@verific/fonts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
} from "@/components/ui/command";
import {
	Drawer,
	DrawerContent,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

import {
	ensureFullStylesheet,
	ensurePreviewStylesheet,
	fontStack,
	useFontFaceStatus,
} from "./font-loading";
import {
	catalogSubsets,
	defaultFontForRole,
	estimateFontPayload,
	filterFontCatalog,
	pushRecentFont,
	readRecentFonts,
	SAMPLE_PRESETS,
	type FontHoverHint,
} from "./font-picker-utils";

export interface FontPickerProps {
	label: string;
	fontRole: FontRole;
	value: ThemeFontSelection;
	onChange: (selection: ThemeFontSelection) => void;
	/** Prévia temporária (hover/teclado) elevada à prévia grande. */
	onHoverPreview?: (hint: FontHoverHint | null) => void;
	/** Desliga a virtualização (testes/jsdom sem layout). */
	virtualize?: boolean;
}

const CATEGORY_LABELS: Record<FontCategory, string> = {
	"sans-serif": "Sem serifa",
	serif: "Serifada",
	display: "Display",
	handwriting: "Manuscrita",
	monospace: "Monoespaçada",
};

/** Altura fixa da linha p/ a matemática do virtualizador (nome + meta). */
const ROW_HEIGHT = 60;

function FontRowName({ entry }: { entry: FontCatalogEntry }) {
	React.useEffect(() => {
		ensurePreviewStylesheet(entry.family);
	}, [entry.family]);
	const status = useFontFaceStatus(entry.family);
	return (
		<span className="flex min-w-0 flex-1 flex-col gap-0.5">
			<span
				className={cn(
					"truncate text-[15px] leading-6",
					status === "loading" && "opacity-70",
				)}
				style={{ fontFamily: fontStack(entry.family, entry.category) }}
				title={entry.family}
			>
				{entry.family}
			</span>
			<span className="text-muted-foreground flex items-center gap-1.5 text-xs">
				{CATEGORY_LABELS[entry.category]} · {entry.weights.length} pesos
				{!hasLatinExt(entry) && (
					<span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
						<AlertTriangle className="h-3 w-3" aria-hidden />
						sem acentos PT
					</span>
				)}
			</span>
		</span>
	);
}

export function FontPicker({
	label,
	fontRole,
	value,
	onChange,
	onHoverPreview,
	virtualize = true,
}: FontPickerProps) {
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState("");
	const [category, setCategory] = React.useState<FontCategory | "all">("all");
	const [subset, setSubset] = React.useState<string>("all");
	const [sort, setSort] = React.useState<"popularity" | "name">("popularity");
	const [catalog, setCatalog] = React.useState<FontCatalogEntry[] | null>(
		null,
	);
	const [loadingCatalog, setLoadingCatalog] = React.useState(false);
	const [catalogError, setCatalogError] = React.useState(false);
	const [recents, setRecents] = React.useState<string[]>([]);
	const [activeValue, setActiveValue] = React.useState("");
	const [previewFamily, setPreviewFamily] = React.useState(value.family);
	const [sampleId, setSampleId] = React.useState<string>(
		fontRole === "heading" ? "heading" : "paragraph",
	);
	const [sampleText, setSampleText] = React.useState<string | null>(null);
	const keyboardNavRef = React.useRef(false);
	const [scrollEl, setScrollEl] = React.useState<HTMLDivElement | null>(null);
	// Padrão do projeto (instance-picker): popover no desktop, gaveta no mobile.
	const isDesktop = useMediaQuery("(min-width: 768px)");

	// Carrega o catálogo com preguiça, só dentro do editor e só ao abrir.
	const loadCatalog = React.useCallback(() => {
		setLoadingCatalog(true);
		setCatalogError(false);
		import("@verific/fonts/catalog")
			.then((module) => {
				setCatalog([...module.getCatalog()]);
			})
			.catch(() => {
				setCatalogError(true);
			})
			.finally(() => {
				setLoadingCatalog(false);
			});
	}, []);

	React.useEffect(() => {
		// A família atual do tema usa a própria fonte no gatilho.
		try {
			ensurePreviewStylesheet(value.family);
		} catch {
			// Nome fora do padrão seguro: ignora.
		}
	}, [value.family]);

	const byFamily = React.useMemo(() => {
		const map = new Map<string, FontCatalogEntry>();
		for (const entry of catalog ?? []) map.set(entry.family, entry);
		return map;
	}, [catalog]);

	const visibleEntries = React.useMemo(
		() =>
			filterFontCatalog(catalog ?? [], {
				query,
				category,
				subset,
				sort,
			}),
		[catalog, query, category, subset, sort],
	);

	const subsetOptions = React.useMemo(
		() => catalogSubsets(catalog ?? []),
		[catalog],
	);

	const recentEntries = React.useMemo(
		() =>
			recents
				.map((family) => byFamily.get(family))
				.filter(
					(entry): entry is FontCatalogEntry => entry !== undefined,
				)
				.slice(0, 6),
		[recents, byFamily],
	);

	const previewEntry = byFamily.get(previewFamily);
	const weightOptions = previewEntry?.weights ?? value.weights;
	const italicOffered = previewEntry
		? previewEntry.styles.includes("italic")
		: false;

	// Prévia e seleção usam a fonte completa (pesos do tema).
	React.useEffect(() => {
		if (!previewEntry) return;
		ensureFullStylesheet(
			previewEntry.family,
			value.family === previewEntry.family
				? value.weights
				: [previewEntry.weights[0] ?? 400],
			value.italic === true,
		);
	}, [previewEntry, value.family, value.weights, value.italic]);

	// Virtualização via tanstack: biblioteca incompatível com o compiler
	// (uso imperativo de refs/scroll interno). O componente apenas consome
	// os itens visíveis; sem acesso a refs no render deste componente.
	// oxlint-disable-next-line react/incompatible-library -- uso confinado à virtualização; bailout aceito, sem quebra.
	const rowVirtualizer = useVirtualizer({
		count: visibleEntries.length,
		getScrollElement: () => scrollEl,
		estimateSize: () => ROW_HEIGHT,
		overscan: 8,
	});

	React.useEffect(() => {
		setActiveValue("");
		// jsdom/navegadores sem scrollTo: guarda p/ não quebrar a árvore.
		if (typeof scrollEl?.scrollTo === "function") {
			scrollEl.scrollTo({ top: 0 });
		}
	}, [query, category, subset, sort, scrollEl]);

	React.useEffect(() => {
		if (!keyboardNavRef.current) return;
		keyboardNavRef.current = false;
		if (!activeValue) return;
		const index = visibleEntries.findIndex(
			(entry) => entry.family === activeValue,
		);
		if (index >= 0) rowVirtualizer.scrollToIndex(index, { align: "auto" });
	}, [activeValue, visibleEntries, rowVirtualizer]);

	function hoverEntry(entry: FontCatalogEntry) {
		setPreviewFamily(entry.family);
		onHoverPreview?.({
			family: entry.family,
			category: entry.category,
			weight: entry.weights[0] ?? 400,
		});
	}

	function handleActiveValue(next: string) {
		setActiveValue(next);
		const entry = byFamily.get(next);
		if (entry) hoverEntry(entry);
	}

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		if (nextOpen) {
			setRecents(readRecentFonts());
			setPreviewFamily(value.family);
			if (!catalog && !loadingCatalog && !catalogError) {
				loadCatalog();
			}
		} else {
			setQuery("");
			onHoverPreview?.(null);
		}
	}

	function selectFamily(family: string) {
		const entry = byFamily.get(family);
		if (!entry) return;
		const weights = value.weights.filter((weight) =>
			entry.weights.includes(weight),
		);
		const nextWeights =
			weights.length > 0 ? weights : [entry.weights[0] ?? 400];
		onChange({
			family: entry.family,
			weights: nextWeights,
			...(value.italic === true && entry.styles.includes("italic")
				? { italic: true as const }
				: {}),
			category: entry.category,
			// Nova família, novas métricas: escala volta ao natural.
			scale: 1,
		});
		setPreviewFamily(entry.family);
		setActiveValue(entry.family);
		setRecents(pushRecentFont(entry.family));
		onHoverPreview?.({
			family: entry.family,
			category: entry.category,
			weight: nextWeights[0] ?? 400,
		});
		ensureFullStylesheet(
			entry.family,
			value.weights,
			value.italic === true,
		);
	}

	function toggleWeight(weight: number) {
		const next = value.weights.includes(weight)
			? value.weights.filter((item) => item !== weight)
			: [...value.weights, weight].sort((a, b) => a - b);
		if (next.length === 0) return;
		onChange({ ...value, weights: next });
		ensureFullStylesheet(value.family, next, value.italic === true);
	}

	function toggleItalic() {
		if (!italicOffered) return;
		onChange({ ...value, italic: value.italic === true ? false : true });
	}

	function resetToDefault() {
		const fallback = defaultFontForRole(fontRole);
		const entry = byFamily.get(fallback.family);
		onChange({
			family: fallback.family,
			weights: fallback.weights,
			category: entry?.category ?? "sans-serif",
			scale: fallback.scale,
		});
		setPreviewFamily(fallback.family);
		onHoverPreview?.({
			family: fallback.family,
			category: entry?.category ?? "sans-serif",
			weight: fallback.weights[0] ?? 400,
		});
	}

	const sample =
		SAMPLE_PRESETS.find((item) => item.id === sampleId) ??
		SAMPLE_PRESETS[0]!;
	const previewWeight = value.weights.includes(400)
		? 400
		: (value.weights[0] ?? 400);
	const payload = estimateFontPayload(
		previewEntry ?? { subsets: ["latin"] },
		value.weights,
		value.italic === true,
		previewEntry?.styles ?? ["normal"],
	);
	const manyWeights = value.weights.length > 3;

	// Escala do papel (passos de 5%): converte em `font-size-adjust` com a
	// métrica pré-computada da família. Sem métricas, desabilita em vez de
	// adivinhar.
	const limits = SCALE_LIMITS[fontRole];
	const aspect = previewEntry?.xHeightRatio;
	const hasMetrics = aspect !== undefined;
	const previewAdjust = buildSizeAdjust(aspect, value.scale);

	function setScale(next: number) {
		if (!hasMetrics) return;
		const clamped = Math.min(limits.max, Math.max(limits.min, next));
		const stepped = Math.round(clamped / limits.step) * limits.step;
		onChange({ ...value, scale: Math.round(stepped * 100) / 100 });
	}

	const virtualRows = virtualize ? rowVirtualizer.getVirtualItems() : [];

	function renderRow(entry: FontCatalogEntry) {
		const selected = value.family === entry.family;
		return (
			<CommandItem
				key={entry.family}
				value={entry.family}
				onSelect={() => selectFamily(entry.family)}
				onMouseMove={() => hoverEntry(entry)}
				className="h-[60px] items-start gap-2 py-2"
			>
				<Check
					className={cn(
						"mt-1 h-4 w-4 shrink-0",
						selected ? "opacity-100" : "opacity-0",
					)}
				/>
				<FontRowName entry={entry} />
			</CommandItem>
		);
	}

	const trigger = (
		<Button
			variant="outline"
			aria-expanded={open}
			aria-label={`${label}: ${value.family}. Abrir seletor de fontes`}
			className="w-44 justify-between"
			type="button"
		>
			<span
				className="truncate"
				style={{
					fontFamily: fontStack(value.family, value.category),
				}}
			>
				{value.family}
			</span>
			<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
		</Button>
	);

	const body = (
		<Command
			shouldFilter={false}
			value={activeValue}
			onValueChange={handleActiveValue}
			onKeyDown={(event) => {
				if (
					event.key === "ArrowDown" ||
					event.key === "ArrowUp" ||
					event.key === "Home" ||
					event.key === "End"
				) {
					keyboardNavRef.current = true;
				}
			}}
			aria-label={label}
		>
			<div className="border-b p-2">
				<CommandInput
					placeholder="Pesquisar fonte..."
					aria-label="Pesquisar fonte"
					value={query}
					onValueChange={setQuery}
				/>
				<div className="mt-2 flex flex-wrap gap-2">
					<Select
						value={category}
						onValueChange={(next) =>
							setCategory(next as FontCategory | "all")
						}
					>
						<SelectTrigger
							size="sm"
							className="w-auto"
							aria-label="Filtrar por categoria"
						>
							<SelectValue placeholder="Categoria" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todas</SelectItem>
							{FONT_CATEGORIES.map((item) => (
								<SelectItem key={item} value={item}>
									{CATEGORY_LABELS[item]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={subset} onValueChange={setSubset}>
						<SelectTrigger
							size="sm"
							className="w-auto"
							aria-label="Filtrar por subconjunto"
						>
							<SelectValue placeholder="Idiomas" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Idiomas: todos</SelectItem>
							{subsetOptions.map((item) => (
								<SelectItem key={item} value={item}>
									{item}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={sort}
						onValueChange={(next) =>
							setSort(next as "popularity" | "name")
						}
					>
						<SelectTrigger
							size="sm"
							className="w-auto"
							aria-label="Ordenar"
						>
							<SelectValue placeholder="Ordem" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="popularity">
								Popularidade
							</SelectItem>
							<SelectItem value="name">Nome</SelectItem>
						</SelectContent>
					</Select>
				</div>
				{recentEntries.length > 0 && query.trim() === "" && (
					<div className="mt-2 flex flex-wrap items-center gap-1.5">
						<span className="text-muted-foreground text-xs">
							Recentes:
						</span>
						{recentEntries.map((entry) => (
							<Badge
								key={entry.family}
								variant={
									value.family === entry.family
										? "default"
										: "secondary"
								}
								className="cursor-pointer"
								onClick={() => selectFamily(entry.family)}
							>
								{entry.family}
							</Badge>
						))}
					</div>
				)}
			</div>

			{loadingCatalog && (
				<div
					className="text-muted-foreground flex items-center gap-2 p-4 text-sm"
					role="status"
				>
					<Loader2 className="h-4 w-4 animate-spin" aria-hidden />
					Carregando fontes...
				</div>
			)}
			{catalogError && (
				<div className="flex flex-col items-start gap-2 p-4 text-sm">
					<span>Não foi possível carregar o catálogo.</span>
					<Button
						size="sm"
						variant="outline"
						onClick={loadCatalog}
						type="button"
					>
						Tentar de novo
					</Button>
				</div>
			)}
			{catalog && (
				<div
					ref={setScrollEl}
					className="max-h-[280px] scroll-py-1 overflow-x-hidden overflow-y-auto"
				>
					<CommandEmpty>Nenhuma fonte encontrada.</CommandEmpty>
					{virtualize ? (
						virtualRows.length > 0 && (
							<div
								style={{
									height: rowVirtualizer.getTotalSize(),
									position: "relative",
									width: "100%",
								}}
							>
								{virtualRows.map((virtualRow) => {
									const entry =
										visibleEntries[virtualRow.index]!;
									return (
										<div
											key={entry.family}
											style={{
												position: "absolute",
												top: 0,
												left: 0,
												width: "100%",
												height: `${virtualRow.size}px`,
												transform: `translateY(${virtualRow.start}px)`,
											}}
										>
											{renderRow(entry)}
										</div>
									);
								})}
							</div>
						)
					) : (
						<div>
							{visibleEntries.map((entry) => renderRow(entry))}
						</div>
					)}
				</div>
			)}

			{previewEntry && (
				<div className="border-t p-3">
					<div
						className="flex flex-wrap gap-1.5"
						role="group"
						aria-label="Amostras"
					>
						{SAMPLE_PRESETS.map((item) => (
							<Button
								key={item.id}
								size="sm"
								variant={
									sampleId === item.id ? "default" : "ghost"
								}
								onClick={() => {
									setSampleId(item.id);
									setSampleText(null);
								}}
								type="button"
							>
								{item.label}
							</Button>
						))}
					</div>
					<Input
						className="mt-2"
						aria-label="Texto da amostra"
						value={sampleText ?? sample.text}
						onChange={(event) => setSampleText(event.target.value)}
					/>
					<p
						className="mt-2 text-xl leading-snug break-words"
						style={{
							fontFamily: fontStack(
								previewEntry.family,
								previewEntry.category,
							),
							fontWeight: previewWeight,
							fontStyle:
								value.italic === true ? "italic" : "normal",
							fontSizeAdjust: previewAdjust ?? undefined,
						}}
					>
						{sampleText ?? sample.text}
					</p>
					{!hasLatinExt(previewEntry) && (
						<p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
							<AlertTriangle className="h-3 w-3" aria-hidden />
							Sem cobertura latin-ext: acentos do português podem
							cair na fonte de reserva.
						</p>
					)}
				</div>
			)}

			<div className="flex flex-col gap-2 border-t p-3">
				<div>
					<Label className="text-xs">Escala</Label>
					<div
						className="mt-1 flex flex-wrap items-center gap-1.5"
						role="group"
						aria-label="Escala da fonte"
					>
						<Button
							size="sm"
							variant="outline"
							aria-label="Diminuir escala"
							disabled={!hasMetrics}
							onClick={() => setScale(value.scale - limits.step)}
							type="button"
						>
							<Minus className="h-3.5 w-3.5" aria-hidden />
						</Button>
						<span
							className="min-w-14 text-center text-sm font-medium tabular-nums"
							aria-live="polite"
						>
							{Math.round(value.scale * 100)}%
						</span>
						<Button
							size="sm"
							variant="outline"
							aria-label="Aumentar escala"
							disabled={!hasMetrics}
							onClick={() => setScale(value.scale + limits.step)}
							type="button"
						>
							<Plus className="h-3.5 w-3.5" aria-hidden />
						</Button>
						{!hasMetrics && (
							<span className="text-muted-foreground text-xs">
								Sem métricas nesta fonte
							</span>
						)}
					</div>
				</div>
				<div>
					<Label className="text-xs">Pesos</Label>
					<div
						className="mt-1 flex flex-wrap gap-1.5"
						role="group"
						aria-label="Pesos da fonte"
					>
						{weightOptions.map((weight) => {
							const pressed = value.weights.includes(weight);
							return (
								<Button
									key={weight}
									size="sm"
									variant={pressed ? "default" : "outline"}
									aria-pressed={pressed}
									aria-label={`Peso ${weight}`}
									onClick={() => toggleWeight(weight)}
									type="button"
								>
									{weight}
								</Button>
							);
						})}
						{italicOffered && (
							<Button
								size="sm"
								variant={
									value.italic === true
										? "default"
										: "outline"
								}
								aria-pressed={value.italic === true}
								aria-label="Itálico"
								onClick={toggleItalic}
								type="button"
							>
								<Italic className="h-3.5 w-3.5" aria-hidden />
							</Button>
						)}
					</div>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<span
						className={cn(
							"text-muted-foreground text-xs",
							manyWeights &&
								"font-medium text-amber-600 dark:text-amber-400",
						)}
					>
						{payload.files}{" "}
						{payload.files === 1 ? "arquivo" : "arquivos"} · ~
						{payload.kb} KB estimados
						{manyWeights && " — cada peso soma bytes"}
					</span>
					<div className="flex gap-1.5">
						<Button
							size="sm"
							variant="ghost"
							onClick={resetToDefault}
							type="button"
						>
							<RotateCcw
								className="mr-1 h-3.5 w-3.5"
								aria-hidden
							/>
							Padrão
						</Button>
						<Button
							size="sm"
							onClick={() => handleOpenChange(false)}
							type="button"
						>
							Concluir
						</Button>
					</div>
				</div>
			</div>
		</Command>
	);

	if (isDesktop) {
		return (
			<Popover open={open} onOpenChange={handleOpenChange}>
				<PopoverTrigger asChild>{trigger}</PopoverTrigger>
				<PopoverContent
					className="max-h-[85vh] w-[min(560px,90vw)] overflow-y-auto p-0"
					align="end"
				>
					{body}
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<Drawer open={open} onOpenChange={handleOpenChange}>
			<DrawerTrigger asChild>{trigger}</DrawerTrigger>
			<DrawerContent className="max-h-[90dvh]">
				<VisuallyHidden>
					<DrawerTitle>{label}: seletor de fontes</DrawerTitle>
				</VisuallyHidden>
				<div className="overflow-y-auto">{body}</div>
			</DrawerContent>
		</Drawer>
	);
}
