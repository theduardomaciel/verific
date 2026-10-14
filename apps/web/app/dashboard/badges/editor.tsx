"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
	ChevronDown,
	Eye,
	EyeOff,
	Plus,
	Printer,
	Redo2,
	RotateCcw,
	Save,
	Trash2,
	Undo2,
} from "lucide-react";
import { toast } from "sonner";

import {
	badgeLayoutSchema,
	computeImposition,
	defaultBadgeItems,
	isLowResolution,
	qrSizeWarnings,
	relativeToBadge,
	type BadgeItem,
	type BadgeLayout,
} from "@verific/badges";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import {
	allowedWeightsForItem,
	buildRowPrimitives,
	createBadgePrintContext,
	fetchBadgeArtwork,
	getBadgeCatalogWeights,
	missingFontWeights,
	runBadgePrint,
	type BadgePrintContext,
	type BadgeRow,
	type PrintProgress,
	type ThemeFontRoles,
} from "@/lib/badges/client";
import { contrastRatio } from "@/lib/theme/resolve";
import { trpc } from "@/lib/trpc/react";

import { BadgeCanvas, type SnapSettings } from "./canvas";
import { BadgePreviewSvg } from "./preview";

interface Props {
	projectId: string;
	eventUrl: string;
	roles: ThemeFontRoles;
	fieldOptions: { id: string; key: string; label: string; type: string }[];
	initial: BadgeLayout | null;
	profilesEnabled: boolean;
}

const clone = (v: BadgeLayout): BadgeLayout =>
	structuredClone(v) as BadgeLayout;

function defaultLayout(): BadgeLayout {
	return badgeLayoutSchema.parse({ items: defaultBadgeItems() });
}

function Num({
	label,
	value,
	onChange,
	step = 0.5,
	min,
	max,
	unit = "mm",
}: {
	label: string;
	value: number;
	onChange: (v: number) => void;
	step?: number;
	min?: number;
	max?: number;
	unit?: string;
}) {
	return (
		<label className="flex flex-col gap-1 text-xs">
			<span className="text-muted-foreground">
				{label} ({unit})
			</span>
			<Input
				type="number"
				value={Math.round(value * 100) / 100}
				step={step}
				min={min}
				max={max}
				onChange={(e) => {
					const v = Number(e.target.value);
					if (Number.isFinite(v)) onChange(v);
				}}
				className="h-8"
			/>
		</label>
	);
}

function CollapsibleCard({
	title,
	defaultOpen = false,
	children,
}: {
	title: string;
	defaultOpen?: boolean;
	children: React.ReactNode;
}) {
	return (
		<Card>
			<Collapsible defaultOpen={defaultOpen}>
				<CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between px-6 text-base leading-none font-semibold [&[data-state=open]>svg]:rotate-180">
					{title}
					<ChevronDown className="size-4 transition-transform" />
				</CollapsibleTrigger>
				<CollapsibleContent className="px-6 pt-4">
					<div className="flex flex-col gap-3">{children}</div>
				</CollapsibleContent>
			</Collapsible>
		</Card>
	);
}

export function BadgeEditor({
	projectId,
	eventUrl,
	roles,
	fieldOptions,
	initial,
	profilesEnabled,
}: Props) {
	const [draft, setDraft] = useState<BadgeLayout>(() =>
		initial ? clone(initial) : defaultLayout(),
	);
	const past = useRef<BadgeLayout[]>([]);
	const future = useRef<BadgeLayout[]>([]);
	const [undoDepth, setUndoDepth] = useState(0);
	const [redoDepth, setRedoDepth] = useState(0);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [snap, setSnap] = useState<SnapSettings>({
		gridOn: true,
		gridSizeMm: 2,
		snapItems: true,
		snapFree: true,
		toleranceMm: 1.5,
	});
	const [showGrid, setShowGrid] = useState(true);
	const [zoom, setZoom] = useState<"fit" | "50" | "100">("fit");
	const [sampleKey, setSampleKey] = useState<"long" | "missing">("long");
	const [ctx, setCtx] = useState<BadgePrintContext | null>(null);
	const [fontsError, setFontsError] = useState<string | null>(null);
	const [printState, setPrintState] = useState<{
		running: boolean;
		progress: PrintProgress | null;
		files: { url: string; filename: string; count: number }[];
		error: string | null;
	}>({ running: false, progress: null, files: [], error: null });
	const [artAspect, setArtAspect] = useState<number | null>(null);
	const [lockAspect, setLockAspect] = useState(true);
	const [catalogWeights, setCatalogWeights] = useState<Map<
		string,
		number[]
	> | null>(null);
	const prevArtUrl = useRef<string | null>(null);

	// Catálogo de pesos por família: alimenta o seletor de peso e a
	// resolução de peso no contexto de impressão.
	useEffect(() => {
		let active = true;
		void getBadgeCatalogWeights().then((map) => {
			if (active) setCatalogWeights(map);
		});
		return () => {
			active = false;
		};
	}, []);

	const utils = trpc.useUtils();
	const saveMutation = trpc.saveLayout.useMutation();
	const uploadMutation = trpc.requestImageUpload.useMutation();

	const draftRef = useRef(draft);
	const commit = (next: BadgeLayout) => {
		draftRef.current = next;
		setDraft(next);
	};

	const patch = (fn: (d: BadgeLayout) => void, pushHistory = false) => {
		const prev = draftRef.current;
		if (pushHistory) {
			past.current.push(clone(prev));
			if (past.current.length > 50) past.current.shift();
			future.current = [];
			setUndoDepth(past.current.length);
			setRedoDepth(0);
		}
		const next = clone(prev);
		fn(next);
		commit(next);
	};

	const undo = () => {
		const prev = past.current.pop();
		if (!prev) return;
		future.current.push(clone(draft));
		commit(prev);
		setUndoDepth(past.current.length);
		setRedoDepth(future.current.length);
	};
	const redo = () => {
		const next = future.current.pop();
		if (!next) return;
		past.current.push(clone(draft));
		commit(next);
		setUndoDepth(past.current.length);
		setRedoDepth(future.current.length);
	};
	const reset = () => {
		past.current.push(clone(draft));
		future.current = [];
		commit(defaultLayout());
		setSelectedId(null);
		setUndoDepth(past.current.length);
		setRedoDepth(0);
	};

	const fieldLabels = useMemo(
		() => new Map(fieldOptions.map((f) => [f.id, f.label])),
		[fieldOptions],
	);

	const samples = useMemo(() => {
		const fake: Record<string, string> = {};
		for (const f of fieldOptions) {
			fake[f.id] = `Exemplo de texto longo — ${f.label}`;
		}
		const long: BadgeRow = {
			name: "Conceição de Almeida Souza e Silva Pereira",
			profileUrl: `https://example.com/${eventUrl}/profile/Amostra01`,
			fields: fake,
		};
		const missing: BadgeRow = {
			name: "Ana Souza",
			profileUrl: `https://example.com/${eventUrl}/profile/Amostra02`,
			fields: {},
		};
		return { long, missing };
	}, [fieldOptions, eventUrl]);

	const loadFonts = async (layout: BadgeLayout) => {
		try {
			const c = await createBadgePrintContext(layout, roles);
			setCtx(c);
			setFontsError(null);
			return c;
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			setFontsError(msg);
			setCtx(null);
			return null;
		}
	};

	// Extrai as famílias/pesos relevantes do layout para saber quando recarregar fontes
	const fontLayoutKey = useMemo(() => {
		const families = new Set<string>();
		const weights = new Map<string, number[]>();
		for (const item of draft.items) {
			if (item.kind !== "text" || !item.enabled) continue;
			const family = item.family || roles[item.fontRole].family;
			families.add(family);
			const existing = weights.get(family) || [];
			if (!existing.includes(item.weight)) existing.push(item.weight);
			weights.set(family, existing);
		}
		// Chave determinística baseada nas famílias e pesos usados
		return JSON.stringify({
			families: [...families].sort(),
			weights: Object.fromEntries(
				[...weights.entries()].map(([f, w]) => [f, [...w].sort()]),
			),
		});
	}, [draft.items, roles]);

	useEffect(() => {
		// Fonte externa: o estado só sincroniza quando o carregamento resolve.
		// eslint-disable-next-line react/set-state-in-effect
		void loadFonts(draft);
	}, [fontLayoutKey]);

	const preview = useMemo(() => {
		if (!ctx) return { primitives: null, error: fontsError };
		try {
			return {
				primitives: buildRowPrimitives(
					{ ...ctx, layout: draft },
					samples[sampleKey],
				),
				error: null,
			};
		} catch (e) {
			return {
				primitives: null,
				error: e instanceof Error ? e.message : String(e),
			};
		}
	}, [ctx, draft, samples, sampleKey, fontsError]);

	// Canvas: posições projetadas (sem recentralizar), para o conteúdo
	// ficar dentro das próprias caixas durante a edição. O efeito da
	// recentralização aparece na prévia em tamanho real.
	const canvasPrimitives = useMemo(() => {
		if (!ctx) return null;
		try {
			return buildRowPrimitives(
				{
					...ctx,
					layout: { ...draft, missingFieldBehavior: "keep" },
				},
				samples[sampleKey],
			);
		} catch {
			return null;
		}
	}, [ctx, draft, samples, sampleKey]);

	const selected = draft.items.find((i) => i.id === selectedId) ?? null;

	const [fontWarnings, setFontWarnings] = useState<string[]>([]);
	useEffect(() => {
		let active = true;
		void missingFontWeights(draft, roles).then((list) => {
			if (active) setFontWarnings(list);
		});
		return () => {
			active = false;
		};
	}, [draft, roles]);

	const warnings = useMemo(() => {
		const list: string[] = [];
		const qrOn = draft.items.some((i) => i.kind === "qr" && i.enabled);
		if (qrOn && !profilesEnabled) {
			list.push(
				"Perfis desativados neste evento: o QR do perfil não leva a nada público. Ative os perfis ou desligue o QR.",
			);
		}
		for (const item of draft.items) {
			if (
				item.kind !== "text" ||
				!item.enabled ||
				!item.source ||
				item.source === "name"
			) {
				continue;
			}
			if (!fieldLabels.has(item.source)) {
				list.push(
					`"${item.label || "Linha secundária"}": campo vinculado não existe mais — vincule novamente e salve, ou a linha sairá em branco.`,
				);
			}
		}
		for (const item of draft.items) {
			if (item.kind !== "text" || !item.enabled) continue;
			if (contrastRatio(item.color, draft.freeAreaBg) < 4.5) {
				list.push(
					`Baixo contraste em "${item.label || item.id}" sobre o fundo da área livre.`,
				);
			}
		}
		if (
			contrastRatio(draft.freeAreaBg, "#ffffff") >
			contrastRatio(draft.freeAreaBg, "#000000")
		) {
			list.push(
				"O fundo da área livre parece escuro — o QR exige fundo claro.",
			);
		}
		for (const item of draft.items) {
			if (item.kind !== "qr" || !item.enabled) continue;
			const abs = relativeToBadge(item.rect, draft.freeArea);
			for (const w of qrSizeWarnings(Math.min(abs.w, abs.h))) {
				list.push(w);
			}
		}
		if (
			draft.artworkPixels &&
			(draft.artworkKind === "png" || draft.artworkKind === "jpg") &&
			isLowResolution(draft.artworkPixels.w, draft.badgeW)
		) {
			list.push(
				`Arte com baixa resolução nesta largura (abaixo de ~300dpi).`,
			);
		}
		if (
			draft.artworkUrl &&
			draft.artworkKind !== "pdf" &&
			draft.artworkPixels &&
			draft.artworkPixels.h > 0 &&
			Math.abs(
				draft.badgeW / draft.badgeH -
					draft.artworkPixels.w / draft.artworkPixels.h,
			) /
				(draft.artworkPixels.w / draft.artworkPixels.h) >
				0.01
		) {
			list.push(
				"A proporção da arte difere do tamanho do crachá — a arte será esticada na impressão.",
			);
		}
		list.push(...fontWarnings);
		return list;
	}, [draft, profilesEnabled, fieldLabels, fontWarnings]);

	const imposition = useMemo(() => {
		if (draft.manualGrid.enabled) return null;
		try {
			return computeImposition({
				badgeW: draft.badgeW + draft.page.bleedMm * 2,
				badgeH: draft.badgeH + draft.page.bleedMm * 2,
				pageW:
					draft.page.size === "custom"
						? (draft.page.customW ?? 210)
						: draft.page.size === "letter"
							? 215.9
							: 210,
				pageH:
					draft.page.size === "custom"
						? (draft.page.customH ?? 297)
						: draft.page.size === "letter"
							? 279.4
							: 297,
				marginMm: draft.page.marginMm,
				gutterMm: draft.page.gutterMm,
				markLengthMm: 3,
				markOffsetMm: 1,
			});
		} catch {
			return null;
		}
	}, [draft]);

	const save = async () => {
		try {
			await saveMutation.mutateAsync({ projectId, layout: draft });
			await loadFonts(draft);
			toast.success("Layout salvo (fontes pré-carregadas p/ impressão).");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
		}
	};

	const setArtworkPixels = (w: number, h: number, fitBadge = false) => {
		setArtAspect(w / h);
		patch((d) => {
			d.artworkPixels = { w, h };
			// O crachá acompanha a proporção da arte: sem isso a arte
			// estica (a saída imprime exatamente o tamanho configurado).
			if (fitBadge && lockAspect) {
				d.badgeH = Math.max(10, (d.badgeW * h) / w);
			}
		});
	};

	// Arte colada por URL: sonda as dimensões uma vez por URL.
	useEffect(() => {
		const url = draft.artworkUrl;
		if (!url || url === prevArtUrl.current) return;
		prevArtUrl.current = url;
		if (draft.artworkKind === "pdf") return;
		const probe = new Image();
		probe.src = url;
		probe
			.decode()
			.then(() => {
				if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
					setArtworkPixels(
						probe.naturalWidth,
						probe.naturalHeight,
						true,
					);
				}
			})
			.catch(() => null);
	}, [draft.artworkUrl, draft.artworkKind]);

	const uploadArtwork = async (file: File) => {
		try {
			let blob: Blob = file;
			let kind: "png" | "jpg" | "pdf" = "png";
			if (
				file.type === "image/svg+xml" ||
				file.name.toLowerCase().endsWith(".svg")
			) {
				// Rasteriza o SVG a ≥300dpi na largura do crachá.
				const url = URL.createObjectURL(file);
				try {
					const img = new Image();
					img.src = url;
					await img.decode();
					const scale = draft.badgeW / 25.4 / (img.width / 300);
					const w = Math.max(1, Math.round(img.width * scale));
					const h = Math.max(1, Math.round(img.height * scale));
					const canvas = document.createElement("canvas");
					canvas.width = w;
					canvas.height = h;
					const g = canvas.getContext("2d");
					if (!g) throw new Error("Canvas indisponível.");
					g.drawImage(img, 0, 0, w, h);
					blob = await new Promise<Blob>((resolve, reject) =>
						canvas.toBlob(
							(b) =>
								b
									? resolve(b)
									: reject(new Error("Falha ao rasterizar.")),
							"image/png",
						),
					);
				} finally {
					URL.revokeObjectURL(url);
				}
				kind = "png";
			} else if (
				file.type === "image/jpeg" ||
				file.name.toLowerCase().match(/\.jpe?g$/)
			) {
				kind = "jpg";
			} else if (file.type === "image/png") {
				kind = "png";
			} else if (
				file.type === "application/pdf" ||
				file.name.toLowerCase().endsWith(".pdf")
			) {
				kind = "pdf";
			} else {
				throw new Error("Envie PNG, JPG, SVG ou PDF.");
			}
			const contentType =
				kind === "pdf"
					? "application/pdf"
					: kind === "jpg"
						? "image/jpeg"
						: "image/png";
			const { uploadUrl, publicUrl } = await uploadMutation.mutateAsync({
				purpose: "badge-artwork",
				projectId,
				contentType,
				contentLength: blob.size,
			});
			const put = await fetch(uploadUrl, { method: "PUT", body: blob });
			if (!put.ok) throw new Error(`Upload falhou (HTTP ${put.status}).`);
			patch((d) => {
				d.artworkUrl = publicUrl;
				d.artworkKind = kind;
				d.artworkPixels = null;
			});
			if (kind !== "pdf") {
				const probe = new Image();
				probe.src = publicUrl;
				await probe.decode().catch(() => null);
				if (probe.naturalWidth > 0) {
					setArtworkPixels(
						probe.naturalWidth,
						probe.naturalHeight,
						true,
					);
				}
			}
			toast.success("Arte enviada.");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Falha no upload.");
		}
	};

	const runPrint = async (testPrint: "single" | "outlines" | null) => {
		setPrintState({
			running: true,
			progress: null,
			files: [],
			error: null,
		});
		try {
			const c = ctx ?? (await loadFonts(draft));
			if (!c) throw new Error(fontsError ?? "Fontes indisponíveis.");
			const artwork = await fetchBadgeArtwork(draft);
			const fetchPage = (cursor: number) =>
				utils.getBadgeBatch.fetch({
					projectId,
					cursor,
					limit: testPrint ? 1 : 200,
				});
			const { files } = await runBadgePrint({
				ctx: { ...c, layout: draft },
				artwork,
				eventUrl,
				testPrint,
				fetchPage,
				onProgress: (progress) =>
					setPrintState((s) => ({ ...s, progress })),
			});
			setPrintState({
				running: false,
				progress: null,
				files: files.map((f) => ({
					url: URL.createObjectURL(f.blob),
					filename: f.filename,
					count: f.count,
				})),
				error: null,
			});
		} catch (e) {
			setPrintState({
				running: false,
				progress: null,
				files: [],
				error: e instanceof Error ? e.message : String(e),
			});
		}
	};

	const mmRect = (item: BadgeItem) => {
		const F = draft.freeArea;
		return {
			x: item.rect.x * F.w,
			y: item.rect.y * F.h,
			w: item.rect.w * F.w,
			h: item.rect.h * F.h,
		};
	};
	const setMmRect = (
		item: BadgeItem,
		v: { x: number; y: number; w: number; h: number },
	) => {
		const F = draft.freeArea;
		patch((d) => {
			const it = d.items.find((i) => i.id === item.id);
			if (!it) return;
			it.rect = {
				x: v.x / F.w,
				y: v.y / F.h,
				w: v.w / F.w,
				h: v.h / F.h,
			};
		}, true);
	};

	const pxPerMm = zoom === "100" ? 3.7795 : zoom === "50" ? 1.8898 : 3.7795;

	return (
		<div className="flex flex-col gap-4">
			<div className="bg-background/90 sticky top-0 z-50 -mx-2 flex flex-wrap items-center gap-2 border-b px-2 py-2 backdrop-blur">
				<Button
					size="sm"
					variant="outline"
					onClick={undo}
					disabled={undoDepth === 0}
				>
					<Undo2 className="size-4" /> Desfazer
				</Button>
				<Button
					size="sm"
					variant="outline"
					onClick={redo}
					disabled={redoDepth === 0}
				>
					<Redo2 className="size-4" /> Refazer
				</Button>
				<Button size="sm" variant="outline" onClick={reset}>
					<RotateCcw className="size-4" /> Padrão
				</Button>
				<Button
					size="sm"
					onClick={() => {
						void save();
					}}
					disabled={saveMutation.isPending}
				>
					<Save className="size-4" />{" "}
					{saveMutation.isPending ? "Salvando…" : "Salvar"}
				</Button>
				<div className="ml-auto flex items-center gap-2 text-xs">
					<Label>Grade</Label>
					<Switch checked={showGrid} onCheckedChange={setShowGrid} />
					<Label>Ajuste</Label>
					<Switch
						checked={snap.gridOn}
						onCheckedChange={(v) =>
							setSnap((s) => ({ ...s, gridOn: v }))
						}
					/>
				</div>
			</div>

			<div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
				<div className="flex min-w-0 flex-col gap-4">
					<div className="grid items-start gap-4 xl:grid-cols-2">
						<Card className="min-w-0">
							<CardHeader>
								<CardTitle className="text-base">
									Editor (proporção real)
								</CardTitle>
							</CardHeader>
							<CardContent>
								<BadgeCanvas
									layout={draft}
									roles={roles}
									sample={samples[sampleKey]}
									primitives={canvasPrimitives}
									fieldLabels={fieldLabels}
									selectedId={selectedId}
									onSelect={setSelectedId}
									onPatch={patch}
									snap={snap}
									showGrid={showGrid}
								/>
								<p className="text-muted-foreground mt-2 text-xs">
									Arraste para mover/redimensionar. Setas
									movem 1mm (Shift: 5mm). Clique fora para
									desselecionar.
								</p>
							</CardContent>
						</Card>

						<Card className="min-w-0">
							<CardHeader>
								<CardTitle className="flex flex-wrap items-center gap-2 text-base">
									Prévia em tamanho real
									<Select
										value={sampleKey}
										onValueChange={(v) =>
											setSampleKey(
												v as "long" | "missing",
											)
										}
									>
										<SelectTrigger
											size="sm"
											className="w-44"
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="long">
												Nome longo
											</SelectItem>
											<SelectItem value="missing">
												Sem secundário
											</SelectItem>
										</SelectContent>
									</Select>
									<Select
										value={zoom}
										onValueChange={(v) =>
											setZoom(v as typeof zoom)
										}
									>
										<SelectTrigger
											size="sm"
											className="w-32"
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="fit">
												Ajustar
											</SelectItem>
											<SelectItem value="50">
												50%
											</SelectItem>
											<SelectItem value="100">
												100% (1:1)
											</SelectItem>
										</SelectContent>
									</Select>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="overflow-auto rounded-md border p-4">
									{preview.primitives ? (
										<div
											className={
												zoom === "fit"
													? "[&_svg]:h-auto [&_svg]:max-w-full"
													: undefined
											}
											style={
												zoom === "fit"
													? { maxWidth: 520 }
													: {
															width:
																draft.badgeW *
																pxPerMm,
														}
											}
										>
											<BadgePreviewSvg
												primitives={preview.primitives}
												badgeWMm={draft.badgeW}
												badgeHMm={draft.badgeH}
												pxPerMm={
													zoom === "fit"
														? 520 / draft.badgeW
														: pxPerMm
												}
												artworkUrl={
													draft.artworkUrl ||
													undefined
												}
												artworkKind={draft.artworkKind}
												mode={draft.mode}
											/>
										</div>
									) : (
										<p className="text-muted-foreground text-sm">
											{preview.error ??
												"Carregando fontes…"}
										</p>
									)}
								</div>
								{warnings.length > 0 ? (
									<ul className="mt-3 flex flex-col gap-1 text-xs text-amber-600 dark:text-amber-400">
										{warnings.map((w, i) => (
											<li key={i}>⚠ {w}</li>
										))}
									</ul>
								) : null}
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">
								Impressão
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-3">
							<div className="flex flex-wrap gap-2">
								<Button
									size="sm"
									disabled={printState.running}
									onClick={() => void runPrint(null)}
								>
									<Printer className="size-4" /> Imprimir tudo
								</Button>
								<Button
									size="sm"
									variant="outline"
									disabled={printState.running}
									onClick={() => void runPrint("single")}
								>
									Prova (1 crachá)
								</Button>
								<Button
									size="sm"
									variant="outline"
									disabled={printState.running}
									onClick={() => void runPrint("outlines")}
								>
									Folha de alinhamento
								</Button>
							</div>
							{printState.running ? (
								<p className="text-muted-foreground text-xs">
									{printState.progress
										? `Buscados ${printState.progress.fetched} · rendidos ${printState.progress.rendered}${printState.progress.total ? ` de ${printState.progress.total}` : ""} · arquivos ${printState.progress.files}`
										: "Iniciando…"}
								</p>
							) : null}
							{printState.error ? (
								<p className="text-destructive text-xs">
									{printState.error}
								</p>
							) : null}
							{printState.files.map((f) => (
								<a
									key={f.filename}
									href={f.url}
									download={f.filename}
									className="text-primary text-sm underline"
								>
									Baixar {f.filename} ({f.count} crachás)
								</a>
							))}
						</CardContent>
					</Card>
				</div>

				<aside className="flex flex-col gap-4 lg:sticky lg:top-14 lg:max-h-[calc(100svh-4.5rem)] lg:overflow-y-auto lg:pr-1">
					{selected?.kind === "text" ? (
						<TextPanel
							item={selected}
							fieldOptions={fieldOptions}
							weightOptions={allowedWeightsForItem(
								selected,
								roles,
								catalogWeights,
							)}
							roleFamilies={{
								heading: roles.heading.family,
								subtitle: roles.subtitle.family,
								body: roles.body.family,
							}}
							mm={mmRect(selected)}
							onMm={(v) => setMmRect(selected, v)}
							onEdit={(fn) =>
								patch((d) => {
									const it = d.items.find(
										(i) => i.id === selected.id,
									);
									if (it && it.kind === "text") fn(it);
								}, true)
							}
						/>
					) : null}
					{selected?.kind === "qr" ? (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">QR</CardTitle>
							</CardHeader>
							<CardContent className="grid grid-cols-2 gap-2">
								{(["x", "y", "w", "h"] as const).map((k) => (
									<Num
										key={k}
										label={k.toUpperCase()}
										value={mmRect(selected)[k]}
										onChange={(v) => {
											const m = mmRect(selected);
											setMmRect(selected, {
												...m,
												[k]: v,
											});
										}}
									/>
								))}
							</CardContent>
						</Card>
					) : null}

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Itens</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-2">
							{draft.items.map((item) => (
								<div
									key={item.id}
									className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${selectedId === item.id ? "border-blue-500" : ""}`}
								>
									<button
										aria-label={
											item.enabled ? "Ocultar" : "Mostrar"
										}
										onClick={() =>
											patch((d) => {
												const it = d.items.find(
													(i) => i.id === item.id,
												);
												if (it)
													it.enabled = !it.enabled;
											}, true)
										}
									>
										{item.enabled ? (
											<Eye className="size-4" />
										) : (
											<EyeOff className="size-4" />
										)}
									</button>
									<button
										className="flex-1 text-left"
										onClick={() => setSelectedId(item.id)}
									>
										{item.kind === "text"
											? item.source === "name"
												? "Nome"
												: (fieldLabels.get(
														item.source,
													) ??
													item.label ??
													"Linha")
											: item.kind === "qr"
												? "QR"
												: "Logo"}
									</button>
									{item.kind === "text" &&
									item.source !== "name" ? (
										<button
											aria-label="Remover linha"
											onClick={() =>
												patch((d) => {
													d.items = d.items.filter(
														(i) => i.id !== item.id,
													);
												}, true)
											}
										>
											<Trash2 className="size-4" />
										</button>
									) : null}
								</div>
							))}
							<Button
								size="sm"
								variant="outline"
								onClick={() =>
									patch((d) => {
										d.items.push({
											kind: "text",
											id: `secondary-${Date.now()}`,
											enabled: true,
											rect: {
												x: 0.1,
												y: 0.3,
												w: 0.8,
												h: 0.12,
											},
											source: "",
											label: "Linha secundária",
											align: "center",
											fontRole: "body",
											family: "",
											fontSizePt: 11,
											minFontSizePt: 7,
											weight: 400,
											color: "#333333",
											maxLines: 2,
										});
									}, true)
								}
							>
								<Plus className="size-4" /> Linha secundária
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">
								Área livre
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-2">
							<div className="grid grid-cols-2 gap-2">
								<Num
									label="X"
									value={draft.freeArea.x}
									onChange={(v) =>
										patch((d) => {
											d.freeArea.x = Math.max(0, v);
										}, true)
									}
								/>
								<Num
									label="Y"
									value={draft.freeArea.y}
									onChange={(v) =>
										patch((d) => {
											d.freeArea.y = Math.max(0, v);
										}, true)
									}
								/>
								<Num
									label="Largura"
									value={draft.freeArea.w}
									onChange={(v) =>
										patch((d) => {
											d.freeArea.w = Math.max(10, v);
										}, true)
									}
								/>
								<Num
									label="Altura"
									value={draft.freeArea.h}
									onChange={(v) =>
										patch((d) => {
											d.freeArea.h = Math.max(10, v);
										}, true)
									}
								/>
								<Num
									label="Raio"
									value={draft.freeArea.radius}
									onChange={(v) =>
										patch((d) => {
											d.freeArea.radius = Math.max(0, v);
										}, true)
									}
								/>
								<Num
									label="Margem int."
									value={draft.freeArea.padding}
									onChange={(v) =>
										patch((d) => {
											d.freeArea.padding = Math.max(0, v);
										}, true)
									}
								/>
							</div>
							<label className="flex flex-col gap-1 text-xs">
								<span className="text-muted-foreground">
									Fundo (precisa ser claro p/ o QR)
								</span>
								<Input
									type="color"
									value={draft.freeAreaBg}
									onChange={(e) =>
										patch((d) => {
											d.freeAreaBg = e.target.value;
										}, true)
									}
									className="h-8 w-20 p-1"
								/>
							</label>
							<label className="flex items-center gap-2 text-xs">
								<Switch
									checked={
										draft.missingFieldBehavior ===
										"recenter"
									}
									onCheckedChange={(v) =>
										patch((d) => {
											d.missingFieldBehavior = v
												? "recenter"
												: "keep";
										}, true)
									}
								/>
								Recentralizar quando faltar campo
							</label>
						</CardContent>
					</Card>

					<CollapsibleCard title="Modo e crachá" defaultOpen>
						<div className="flex flex-col gap-1 text-xs">
							<span className="text-muted-foreground">
								Modo de impressão
							</span>
							<Select
								value={draft.mode}
								onValueChange={(v) =>
									patch((d) => {
										d.mode = v as BadgeLayout["mode"];
									}, true)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="data-only">
										Só dados (papel pré-impresso)
									</SelectItem>
									<SelectItem value="full">
										Crachá completo (arte + dados)
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<Num
								label="Largura"
								value={draft.badgeW}
								onChange={(v) =>
									patch((d) => {
										d.badgeW = Math.max(10, v);
										if (lockAspect && artAspect) {
											d.badgeH = Math.max(
												10,
												d.badgeW / artAspect,
											);
										}
									}, true)
								}
							/>
							<Num
								label="Altura"
								value={draft.badgeH}
								onChange={(v) =>
									patch((d) => {
										d.badgeH = Math.max(10, v);
									}, true)
								}
							/>
						</div>
						<label className="flex items-center gap-2 text-xs">
							<Switch
								checked={lockAspect}
								onCheckedChange={setLockAspect}
							/>
							Manter proporção da arte
						</label>
						<div className="flex flex-col gap-1 text-xs">
							<span className="text-muted-foreground">
								Arte (PNG, JPG, SVG ou PDF)
							</span>
							<Input
								type="file"
								accept=".png,.jpg,.jpeg,.svg,.pdf"
								onChange={(e) => {
									const f = e.target.files?.[0];
									if (f) void uploadArtwork(f);
									e.target.value = "";
								}}
							/>
							<Input
								placeholder="ou cole a URL da arte"
								value={draft.artworkUrl}
								onChange={(e) =>
									patch((d) => {
										d.artworkUrl = e.target.value;
									})
								}
							/>
							{draft.artworkUrl ? (
								<Button
									size="sm"
									variant="outline"
									onClick={() =>
										patch((d) => {
											d.artworkUrl = "";
											d.artworkPixels = null;
										}, true)
									}
								>
									Remover arte
								</Button>
							) : null}
						</div>
					</CollapsibleCard>

					<CollapsibleCard title="Folha e imposição">
						<div className="flex flex-col gap-1 text-xs">
							<span className="text-muted-foreground">
								Página
							</span>
							<Select
								value={draft.page.size}
								onValueChange={(v) =>
									patch((d) => {
										d.page.size =
											v as BadgeLayout["page"]["size"];
									}, true)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="a4">A4</SelectItem>
									<SelectItem value="letter">
										Letter
									</SelectItem>
									<SelectItem value="custom">
										Personalizado
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{draft.page.size === "custom" ? (
							<div className="grid grid-cols-2 gap-2">
								<Num
									label="Larg. pág."
									value={draft.page.customW ?? 210}
									onChange={(v) =>
										patch((d) => {
											d.page.customW = v;
										}, true)
									}
								/>
								<Num
									label="Alt. pág."
									value={draft.page.customH ?? 297}
									onChange={(v) =>
										patch((d) => {
											d.page.customH = v;
										}, true)
									}
								/>
							</div>
						) : null}
						<div className="grid grid-cols-2 gap-2">
							<Num
								label="Margem"
								value={draft.page.marginMm}
								onChange={(v) =>
									patch((d) => {
										d.page.marginMm = Math.max(0, v);
									}, true)
								}
							/>
							<Num
								label="Medianiz"
								value={draft.page.gutterMm}
								onChange={(v) =>
									patch((d) => {
										d.page.gutterMm = Math.max(0, v);
									}, true)
								}
							/>
							<Num
								label="Sangria"
								value={draft.page.bleedMm}
								onChange={(v) =>
									patch((d) => {
										d.page.bleedMm = Math.max(0, v);
									}, true)
								}
							/>
						</div>
						<label className="flex items-center gap-2 text-xs">
							<Switch
								checked={draft.page.cropMarks}
								onCheckedChange={(v) =>
									patch((d) => {
										d.page.cropMarks = v;
									}, true)
								}
							/>
							Marcas de corte
						</label>
						{imposition ? (
							<p className="text-muted-foreground text-xs">
								Auto: {imposition.cols}×{imposition.rows} por
								folha
								{imposition.rotated ? " (girado)" : ""} ·
								desperdício {imposition.wastedPct}%
								{imposition.gutterWarning
									? ` · ${imposition.gutterWarning}`
									: ""}
							</p>
						) : (
							<p className="text-muted-foreground text-xs">
								Grade manual ativa.
							</p>
						)}
						<label className="flex items-center gap-2 text-xs">
							<Switch
								checked={draft.manualGrid.enabled}
								onCheckedChange={(v) =>
									patch((d) => {
										d.manualGrid.enabled = v;
									}, true)
								}
							/>
							Grade manual
						</label>
						{draft.manualGrid.enabled ? (
							<div className="grid grid-cols-2 gap-2">
								<Num
									label="Colunas"
									unit=""
									value={draft.manualGrid.cols}
									step={1}
									onChange={(v) =>
										patch((d) => {
											d.manualGrid.cols = Math.max(
												1,
												Math.round(v),
											);
										}, true)
									}
								/>
								<Num
									label="Linhas"
									unit=""
									value={draft.manualGrid.rows}
									step={1}
									onChange={(v) =>
										patch((d) => {
											d.manualGrid.rows = Math.max(
												1,
												Math.round(v),
											);
										}, true)
									}
								/>
								<Num
									label="Origem X"
									value={draft.manualGrid.originX}
									onChange={(v) =>
										patch((d) => {
											d.manualGrid.originX = Math.max(
												0,
												v,
											);
										}, true)
									}
								/>
								<Num
									label="Origem Y"
									value={draft.manualGrid.originY}
									onChange={(v) =>
										patch((d) => {
											d.manualGrid.originY = Math.max(
												0,
												v,
											);
										}, true)
									}
								/>
							</div>
						) : null}
						<div className="grid grid-cols-2 gap-2">
							<Num
								label="Calib. X"
								value={draft.calibration.dx}
								onChange={(v) =>
									patch((d) => {
										d.calibration.dx = v;
									}, true)
								}
							/>
							<Num
								label="Calib. Y"
								value={draft.calibration.dy}
								onChange={(v) =>
									patch((d) => {
										d.calibration.dy = v;
									}, true)
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<Num
								label="Grade (snap)"
								value={snap.gridSizeMm}
								onChange={(v) =>
									setSnap((s) => ({
										...s,
										gridSizeMm: Math.max(0.5, v),
									}))
								}
							/>
						</div>
						<label className="flex items-center gap-2 text-xs">
							<Switch
								checked={snap.snapItems}
								onCheckedChange={(v) =>
									setSnap((s) => ({ ...s, snapItems: v }))
								}
							/>
							Ajustar a itens
						</label>
						<label className="flex items-center gap-2 text-xs">
							<Switch
								checked={snap.snapFree}
								onCheckedChange={(v) =>
									setSnap((s) => ({ ...s, snapFree: v }))
								}
							/>
							Ajustar à área livre
						</label>
					</CollapsibleCard>
				</aside>
			</div>
		</div>
	);
}

function TextPanel({
	item,
	fieldOptions,
	weightOptions,
	roleFamilies,
	mm,
	onMm,
	onEdit,
}: {
	item: Extract<BadgeItem, { kind: "text" }>;
	fieldOptions: { id: string; label: string }[];
	/** Pesos disponíveis para a fonte do item (catálogo + peso atual). */
	weightOptions: number[];
	/** Famílias de fonte disponíveis por papel do tema. */
	roleFamilies: { heading: string; subtitle: string; body: string };
	mm: { x: number; y: number; w: number; h: number };
	onMm: (v: { x: number; y: number; w: number; h: number }) => void;
	onEdit: (fn: (it: Extract<BadgeItem, { kind: "text" }>) => void) => void;
}) {
	// Unique font families from theme roles
	const familyOptions = [
		...new Set([
			roleFamilies.heading,
			roleFamilies.subtitle,
			roleFamilies.body,
		]),
	];
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Texto</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{item.source !== "name" ? (
					<div className="flex flex-col gap-1 text-xs">
						<span className="text-muted-foreground">
							Campo do formulário
						</span>
						<Select
							value={item.source || "__none"}
							onValueChange={(v) =>
								onEdit((it) => {
									it.source = v === "__none" ? "" : v;
								})
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none">
									Não vinculado
								</SelectItem>
								{fieldOptions.map((f) => (
									<SelectItem key={f.id} value={f.id}>
										{f.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				) : null}
				<div className="flex flex-col gap-1 text-xs">
					<span className="text-muted-foreground">Família</span>
					<Select
						value={item.family || roleFamilies[item.fontRole]}
						onValueChange={(v) =>
							onEdit((it) => {
								it.family = v;
							})
						}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{familyOptions.map((f) => (
								<SelectItem key={f} value={f}>
									{f}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex flex-col gap-1 text-xs">
					<span className="text-muted-foreground">Alinhamento</span>
					<Select
						value={item.align}
						onValueChange={(v) =>
							onEdit((it) => {
								it.align = v as "left" | "center" | "right";
							})
						}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="left">Esquerda</SelectItem>
							<SelectItem value="center">Centro</SelectItem>
							<SelectItem value="right">Direita</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<Num
						label="Tamanho"
						unit="pt"
						value={item.fontSizePt}
						onChange={(v) =>
							onEdit((it) => {
								it.fontSizePt = Math.max(4, v);
							})
						}
					/>
					<Num
						label="Mínimo"
						unit="pt"
						value={item.minFontSizePt}
						onChange={(v) =>
							onEdit((it) => {
								it.minFontSizePt = Math.max(4, v);
							})
						}
					/>
					<div className="flex flex-col gap-1 text-xs">
						<span className="text-muted-foreground">Peso</span>
						<Select
							value={String(item.weight)}
							onValueChange={(v) =>
								onEdit((it) => {
									it.weight = Number(v);
								})
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{weightOptions.map((w) => (
									<SelectItem key={w} value={String(w)}>
										{w}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<Num
						label="Máx. linhas"
						unit=""
						step={1}
						value={item.maxLines}
						onChange={(v) =>
							onEdit((it) => {
								it.maxLines = Math.max(1, Math.round(v));
							})
						}
					/>
				</div>
				<label className="flex flex-col gap-1 text-xs">
					<span className="text-muted-foreground">Cor</span>
					<Input
						type="color"
						value={item.color}
						onChange={(e) =>
							onEdit((it) => {
								it.color = e.target.value;
							})
						}
						className="h-8 w-20 p-1"
					/>
				</label>
				<div className="grid grid-cols-2 gap-2">
					{(["x", "y", "w", "h"] as const).map((k) => (
						<Num
							key={k}
							label={k.toUpperCase()}
							value={mm[k]}
							onChange={(v) => onMm({ ...mm, [k]: v })}
						/>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
