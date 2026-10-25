"use client";

import { useEffect, useRef, useState } from "react";

import {
	relativeToBadge,
	snapRect,
	type BadgeItem,
	type BadgeLayout,
	type DisplayPrimitive,
	type Guide,
} from "@verific/badges";

import { PrimitiveLayer } from "./preview";

import type { ThemeFontRoles } from "@/lib/badges/client";

export interface SnapSettings {
	gridOn: boolean;
	gridSizeMm: number;
	snapItems: boolean;
	snapFree: boolean;
	toleranceMm: number;
}

interface Props {
	layout: BadgeLayout;
	/** Mantido por compatibilidade; o texto vem da display list. */
	roles?: ThemeFontRoles;
	sample: { name: string; fields: Record<string, string> };
	/** Mesma display list da prévia/PDF (null enquanto as fontes carregam). */
	primitives: DisplayPrimitive[] | null;
	fieldLabels: Map<string, string>;
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	/** pushHistory=true snapshots undo before applying. */
	onPatch: (fn: (draft: BadgeLayout) => void, pushHistory?: boolean) => void;
	snap: SnapSettings;
	showGrid: boolean;
}

type DragMode = "move-item" | "resize-item" | "move-free" | "resize-free";
type HandleKey = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface MmRect {
	x: number;
	y: number;
	w: number;
	h: number;
}

interface DragState {
	mode: DragMode;
	id: string | null;
	handle: HandleKey | null;
	/** Ponteiro no início do arrasto (mm, coordenadas do crachá). */
	startX: number;
	startY: number;
	/** Retângulo do item (ou da área livre) no início do arrasto. */
	startRect: MmRect;
	/** Já empilhou histórico de undo neste arrasto? */
	pushed: boolean;
}

const HANDLES: {
	key: HandleKey;
	fx: number;
	fy: number;
	cursor: string;
}[] = [
	{ key: "nw", fx: 0, fy: 0, cursor: "nwse-resize" },
	{ key: "n", fx: 0.5, fy: 0, cursor: "ns-resize" },
	{ key: "ne", fx: 1, fy: 0, cursor: "nesw-resize" },
	{ key: "e", fx: 1, fy: 0.5, cursor: "ew-resize" },
	{ key: "se", fx: 1, fy: 1, cursor: "nwse-resize" },
	{ key: "s", fx: 0.5, fy: 1, cursor: "ns-resize" },
	{ key: "sw", fx: 0, fy: 1, cursor: "nesw-resize" },
	{ key: "w", fx: 0, fy: 0.5, cursor: "ew-resize" },
];
const CORNER_KEYS: HandleKey[] = ["nw", "ne", "se", "sw"];

/** Margem de trabalho ao redor do crachá (mm) — evita cortar os handles. */
const PAD_MM = 6;
const HANDLE_PX = 11;
const HANDLE_HIT_PX = 22;
const DEAD_ZONE_PX = 3;
const MIN_ITEM_MM = 2;
const MIN_FREE_MM = 10;

const C_ITEM = "#2563eb";
const C_ITEM_IDLE = "#475569";
const C_FREE = "#0891b2";
const C_GUIDE = "#f43f5e";
const C_WORKSPACE = "#e2e8f0";

function itemLabel(item: BadgeItem, fieldLabels: Map<string, string>): string {
	if (item.kind === "qr") return "QR";
	if (item.kind === "logo") return "Logo";
	if (item.source === "name") return "Nome";
	if (!item.source) return item.label || "Linha";
	return fieldLabels.get(item.source) ?? item.label ?? "Linha";
}

function hasValue(item: BadgeItem, sample: Props["sample"]): boolean {
	if (item.kind !== "text") return true;
	if (item.source === "name") return sample.name.trim().length > 0;
	if (!item.source) return false;
	return (sample.fields[item.source] ?? "").trim().length > 0;
}

function clamp(v: number, lo: number, hi: number) {
	return Math.max(lo, Math.min(hi, v));
}

/** Contorno com halo branco: legível sobre qualquer arte ou fundo. */
function Outline({
	r,
	rx = 0,
	color,
	width,
	dash,
	haloWidth,
}: {
	r: MmRect;
	rx?: number;
	color: string;
	width: number;
	dash?: string;
	haloWidth?: number;
}) {
	return (
		<g pointerEvents="none" fill="none">
			<rect
				x={r.x}
				y={r.y}
				width={r.w}
				height={r.h}
				rx={rx}
				stroke="#fff"
				strokeOpacity={0.9}
				strokeWidth={haloWidth ?? width + 2.5}
				vectorEffect="non-scaling-stroke"
			/>
			<rect
				x={r.x}
				y={r.y}
				width={r.w}
				height={r.h}
				rx={rx}
				stroke={color}
				strokeWidth={width}
				strokeDasharray={dash}
				vectorEffect="non-scaling-stroke"
			/>
		</g>
	);
}

/**
 * Redimensiona `s` arrastando `handle` por (dx, dy). O lado oposto fica
 * fixo; respeita tamanho mínimo, limites e (opcional) proporção quadrada.
 * Para itens quadrados (QR), mantém o quadrado mesmo ao atingir os limites,
 * ancorando no canto oposto ao handle arrastado.
 */
function resizeRect(
	s: MmRect,
	handle: HandleKey,
	dx: number,
	dy: number,
	min: number,
	bounds: MmRect,
	square: boolean,
): MmRect {
	// Valores originais (antes de qualquer modificação)
	const origL = s.x;
	const origT = s.y;
	const origR = s.x + s.w;
	const origB = s.y + s.h;

	let l = origL;
	let t = origT;
	let r = origR;
	let b = origB;
	const west = handle.includes("w");
	const east = handle.includes("e");
	const north = handle.includes("n");
	const south = handle.includes("s");

	// Para handles de borda (não-canto), comporta-se como antes
	const isCorner = (west || east) && (north || south);

	if (!square || !isCorner) {
		// Lógica original para handles de borda ou itens não-quadrados
		if (west) l = Math.min(l + dx, r - min);
		if (east) r = Math.max(r + dx, l + min);
		if (north) t = Math.min(t + dy, b - min);
		if (south) b = Math.max(b + dy, t + min);

		l = Math.max(l, bounds.x);
		t = Math.max(t, bounds.y);
		r = Math.min(r, bounds.x + bounds.w);
		b = Math.min(b, bounds.y + bounds.h);
		return { x: l, y: t, w: Math.max(r - l, min), h: Math.max(b - t, min) };
	}

	// Para itens quadrados com handle de canto: ancora no canto oposto
	// NW (west+north) → ancora SE (origR, origB)
	// NE (east+north) → ancora SW (origL, origB)
	// SW (west+south) → ancora NE (origR, origT)
	// SE (east+south) → ancora NW (origL, origT)

	const anchorX = west ? origR : origL; // X do canto âncora (fixo)
	const anchorY = north ? origB : origT; // Y do canto âncora (fixo)

	// Nova posição do canto arrastado (após aplicar dx, dy)
	const draggedX = west ? origL + dx : origR + dx;
	const draggedY = north ? origT + dy : origB + dy;

	// Lado do quadrado = distância do canto âncora ao canto arrastado
	// Para NW: side = max(origR - draggedX, origB - draggedY)
	// Para NE: side = max(draggedX - origL, origB - draggedY)
	// Para SW: side = max(origR - draggedX, draggedY - origT)
	// Para SE: side = max(draggedX - origL, draggedY - origT)
	const desiredW = west ? anchorX - draggedX : draggedX - anchorX;
	const desiredH = north ? anchorY - draggedY : draggedY - anchorY;
	let side = Math.max(Math.max(desiredW, desiredH), min);

	// Posiciona o quadrado com o canto âncora fixo
	let newL = west ? anchorX - side : anchorX;
	let newT = north ? anchorY - side : anchorY;

	// Aplica limites: se o quadrado sai dos bounds, reduz o lado mantendo a âncora
	if (newL < bounds.x) {
		const maxSide = anchorX - bounds.x;
		side = Math.min(side, maxSide);
		newL = west ? anchorX - side : anchorX;
	}
	if (newL + side > bounds.x + bounds.w) {
		const maxSide = bounds.x + bounds.w - anchorX;
		side = Math.min(side, maxSide);
		newL = west ? anchorX - side : anchorX;
	}
	if (newT < bounds.y) {
		const maxSide = anchorY - bounds.y;
		side = Math.min(side, maxSide);
		newT = north ? anchorY - side : anchorY;
	}
	if (newT + side > bounds.y + bounds.h) {
		const maxSide = bounds.y + bounds.h - anchorY;
		side = Math.min(side, maxSide);
		newT = north ? anchorY - side : anchorY;
	}

	return { x: newL, y: newT, w: side, h: side };
}

export function BadgeCanvas({
	layout,
	sample,
	primitives,
	fieldLabels,
	selectedId,
	onSelect,
	onPatch,
	snap,
	showGrid,
}: Props) {
	const svgRef = useRef<SVGSVGElement>(null);
	const [guides, setGuides] = useState<Guide[]>([]);
	const [pxPerMm, setPxPerMm] = useState(4);
	const [hoverId, setHoverId] = useState<string | null>(null);
	const drag = useRef<DragState | null>(null);

	const { badgeW: W, badgeH: H, freeArea: F } = layout;
	const VW = W + PAD_MM * 2;
	const VH = H + PAD_MM * 2;
	const badgeRect: MmRect = { x: 0, y: 0, w: W, h: H };

	// Escala real em tela: handles, traços e textos de UI ficam constantes em px.
	useEffect(() => {
		const el = svgRef.current;
		if (!el) return;
		const update = () => {
			const w = el.getBoundingClientRect().width;
			if (w > 0) setPxPerMm(w / (W + PAD_MM * 2));
		};
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, [W]);

	const px = (n: number) => n / pxPerMm;
	const hs = px(HANDLE_PX);
	const hit = px(HANDLE_HIT_PX);

	const toMm = (clientX: number, clientY: number) => {
		const el = svgRef.current;
		if (!el) return { x: 0, y: 0 };
		const r = el.getBoundingClientRect();
		return {
			x: ((clientX - r.left) / r.width) * VW - PAD_MM,
			y: ((clientY - r.top) / r.height) * VH - PAD_MM,
		};
	};

	const begin = (
		e: React.PointerEvent,
		id: string | null,
		mode: DragMode,
		handle: HandleKey | null = null,
	) => {
		if (e.button !== 0) return;
		e.stopPropagation();
		const svg = svgRef.current;
		svg?.setPointerCapture(e.pointerId);
		svg?.focus({ preventScroll: true });
		const p = toMm(e.clientX, e.clientY);
		const item = id ? layout.items.find((i) => i.id === id) : undefined;
		const startRect: MmRect = item
			? relativeToBadge(item.rect, layout.freeArea)
			: {
					x: layout.freeArea.x,
					y: layout.freeArea.y,
					w: layout.freeArea.w,
					h: layout.freeArea.h,
				};
		drag.current = {
			mode,
			id,
			handle,
			startX: p.x,
			startY: p.y,
			startRect,
			pushed: false,
		};
		onSelect(id);
	};

	const move = (e: React.PointerEvent) => {
		const d = drag.current;
		if (!d) return;
		const p = toMm(e.clientX, e.clientY);
		let dx = p.x - d.startX;
		let dy = p.y - d.startY;

		// Zona morta: um clique simples não mexe nem suja o histórico.
		const dead = px(DEAD_ZONE_PX);
		if (!d.pushed && Math.abs(dx) < dead && Math.abs(dy) < dead) return;

		// Histórico empilhado uma única vez, no primeiro movimento real.
		const apply = (fn: (draft: BadgeLayout) => void) => {
			const push = !d.pushed;
			d.pushed = true;
			onPatch(fn, push);
		};

		const snapOpts = {
			gridSizeMm: snap.gridSizeMm,
			gridOn: snap.gridOn,
			toleranceMm: snap.toleranceMm,
			snapToItems: snap.snapItems,
			snapToFreeArea: snap.snapFree,
		};
		const isFreeMode = d.mode === "move-free" || d.mode === "resize-free";
		// Alvos de encaixe: itens (+ área livre) para itens; só o crachá para a área livre.
		const others: MmRect[] = isFreeMode
			? []
			: layout.items
					.filter((i) => i.enabled && i.id !== d.id)
					.map((i) => relativeToBadge(i.rect, layout.freeArea));
		const snapTarget: MmRect = isFreeMode
			? badgeRect
			: { x: F.x, y: F.y, w: F.w, h: F.h };
		const s = d.startRect;

		if (d.mode === "move-item" || d.mode === "move-free") {
			const raw = { ...s, x: s.x + dx, y: s.y + dy };
			const snapped = snapRect(raw, others, snapTarget, snapOpts);
			setGuides(snapped.guides);
			const bounds = isFreeMode ? badgeRect : F;
			const nx = clamp(
				snapped.rect.x,
				bounds.x,
				bounds.x + bounds.w - s.w,
			);
			const ny = clamp(
				snapped.rect.y,
				bounds.y,
				bounds.y + bounds.h - s.h,
			);
			if (d.mode === "move-item" && d.id) {
				const id = d.id;
				apply((draft) => {
					const target = draft.items.find((i) => i.id === id);
					if (!target) return;
					target.rect = {
						...target.rect,
						x: (nx - draft.freeArea.x) / draft.freeArea.w,
						y: (ny - draft.freeArea.y) / draft.freeArea.h,
					};
				});
			} else {
				apply((draft) => {
					draft.freeArea.x = nx;
					draft.freeArea.y = ny;
				});
			}
			return;
		}

		// Resize (item ou área livre) por qualquer handle.
		const handle = d.handle;
		if (!handle) return;
		const west = handle.includes("w");
		const east = handle.includes("e");
		const north = handle.includes("n");
		const south = handle.includes("s");
		// Encaixa a(s) borda(s) que se movem, como pontos de tamanho zero.
		const edgeX = west ? s.x + dx : east ? s.x + s.w + dx : s.x;
		const edgeY = north ? s.y + dy : south ? s.y + s.h + dy : s.y;
		const snapped = snapRect(
			{ x: edgeX, y: edgeY, w: 0, h: 0 },
			others,
			snapTarget,
			snapOpts,
		);
		const activeGuides: Guide[] = [];
		if (west || east) {
			dx += snapped.rect.x - edgeX;
			for (const g of snapped.guides)
				if (g.axis === "v") activeGuides.push(g);
		}
		if (north || south) {
			dy += snapped.rect.y - edgeY;
			for (const g of snapped.guides)
				if (g.axis === "h") activeGuides.push(g);
		}
		setGuides(activeGuides);

		if (d.mode === "resize-item" && d.id) {
			const id = d.id;
			const item = layout.items.find((i) => i.id === id);
			if (!item) return;
			const next = resizeRect(
				s,
				handle,
				dx,
				dy,
				MIN_ITEM_MM,
				{ x: F.x, y: F.y, w: F.w, h: F.h },
				item.kind === "qr",
			);
			apply((draft) => {
				const it = draft.items.find((i) => i.id === id);
				if (!it) return;
				it.rect = {
					x: (next.x - draft.freeArea.x) / draft.freeArea.w,
					y: (next.y - draft.freeArea.y) / draft.freeArea.h,
					w: next.w / draft.freeArea.w,
					h: next.h / draft.freeArea.h,
				};
			});
		} else if (d.mode === "resize-free") {
			const next = resizeRect(
				s,
				handle,
				dx,
				dy,
				MIN_FREE_MM,
				badgeRect,
				false,
			);
			apply((draft) => {
				draft.freeArea.x = next.x;
				draft.freeArea.y = next.y;
				draft.freeArea.w = next.w;
				draft.freeArea.h = next.h;
			});
		}
	};

	const end = (e: React.PointerEvent) => {
		if (svgRef.current?.hasPointerCapture(e.pointerId)) {
			svgRef.current.releasePointerCapture(e.pointerId);
		}
		drag.current = null;
		setGuides([]);
	};

	const onKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			onSelect(null);
			return;
		}
		if (!selectedId) return;
		const step = e.shiftKey ? 5 : 1;
		let dx = 0;
		let dy = 0;
		if (e.key === "ArrowLeft") dx = -step;
		else if (e.key === "ArrowRight") dx = step;
		else if (e.key === "ArrowUp") dy = -step;
		else if (e.key === "ArrowDown") dy = step;
		else return;
		e.preventDefault();
		const id = selectedId;
		onPatch((draft) => {
			const item = draft.items.find((i) => i.id === id);
			if (!item) return;
			item.rect = {
				...item.rect,
				x: clamp(
					item.rect.x + dx / draft.freeArea.w,
					0,
					1 - item.rect.w,
				),
				y: clamp(
					item.rect.y + dy / draft.freeArea.h,
					0,
					1 - item.rect.h,
				),
			};
		}, true);
	};

	const gridLines: React.ReactNode[] = [];
	if (showGrid && snap.gridSizeMm > 0) {
		for (let x = snap.gridSizeMm; x < W; x += snap.gridSizeMm) {
			gridLines.push(
				<line
					key={`v${x}`}
					x1={x}
					y1={0}
					x2={x}
					y2={H}
					stroke="#64748b"
					strokeOpacity={0.22}
					strokeWidth={1}
					vectorEffect="non-scaling-stroke"
				/>,
			);
		}
		for (let y = snap.gridSizeMm; y < H; y += snap.gridSizeMm) {
			gridLines.push(
				<line
					key={`h${y}`}
					x1={0}
					y1={y}
					x2={W}
					y2={y}
					stroke="#64748b"
					strokeOpacity={0.22}
					strokeWidth={1}
					vectorEffect="non-scaling-stroke"
				/>,
			);
		}
	}

	const enabledItems = layout.items.filter((i) => i.enabled);
	const selectedItem = enabledItems.find((i) => i.id === selectedId) ?? null;
	// For QR codes, compute square rect (same logic as display-list)
	const selectedAbs = selectedItem
		? selectedItem.kind === "qr"
			? (() => {
					const abs = relativeToBadge(selectedItem.rect, F);
					const side = Math.min(abs.w, abs.h);
					return {
						x: abs.x + (abs.w - side) / 2,
						y: abs.y + (abs.h - side) / 2,
						w: side,
						h: side,
					};
				})()
			: relativeToBadge(selectedItem.rect, F)
		: null;

	const renderHandles = (
		r: MmRect,
		keys: HandleKey[],
		color: string,
		mode: DragMode,
		id: string | null,
	) =>
		HANDLES.filter((h) => keys.includes(h.key)).map((h) => {
			const cx = r.x + r.w * h.fx;
			const cy = r.y + r.h * h.fy;
			return (
				<g
					key={`${mode}-${h.key}`}
					style={{ cursor: h.cursor }}
					onPointerDown={(e) => begin(e, id, mode, h.key)}
				>
					<rect
						x={cx - hit / 2}
						y={cy - hit / 2}
						width={hit}
						height={hit}
						fill="transparent"
					/>
					<rect
						x={cx - hs / 2}
						y={cy - hs / 2}
						width={hs}
						height={hs}
						rx={px(2)}
						fill="#fff"
						stroke={color}
						strokeWidth={2}
						vectorEffect="non-scaling-stroke"
						pointerEvents="none"
					/>
				</g>
			);
		});

	const tabFont = px(11);
	const tabH = px(20);
	const tabText = "Área livre";
	const tabW = tabText.length * tabFont * 0.58 + px(14);
	const tabY = Math.max(F.y - tabH, -PAD_MM);

	const chip = selectedItem
		? (() => {
				const text = itemLabel(selectedItem, fieldLabels);
				const w = text.length * tabFont * 0.58 + px(12);
				return {
					text,
					w,
					x: selectedAbs!.x,
					y: Math.max(selectedAbs!.y - tabH - px(2), -PAD_MM),
				};
			})()
		: null;

	return (
		<svg
			ref={svgRef}
			viewBox={`${-PAD_MM} ${-PAD_MM} ${VW} ${VH}`}
			className="mx-auto h-auto w-full touch-none rounded-md outline-none select-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
			style={{
				background: C_WORKSPACE,
				// Limita a ALTURA pela viewport: largura máx = altura útil × proporção.
				// 18rem ≈ cabeçalho da página + card + dica abaixo; mínimo de 320px.
				maxWidth: `max(320px, calc((100svh - 12rem) * ${VW / VH}))`,
			}}
			onPointerMove={move}
			onPointerUp={end}
			onPointerCancel={end}
			onPointerDown={() => onSelect(null)}
			onKeyDown={onKeyDown}
			// oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- svg tem role="application" e trata setas do teclado; foco é funcional.
			tabIndex={0}
			role="application"
			aria-label="Editor do crachá (setas movem o item selecionado)"
		>
			{/* Crachá */}
			<rect
				x={0}
				y={0}
				width={W}
				height={H}
				fill="#fff"
				pointerEvents="none"
			/>
			{layout.artworkUrl && layout.artworkKind !== "pdf" ? (
				<image
					href={layout.artworkUrl}
					x={0}
					y={0}
					width={W}
					height={H}
					preserveAspectRatio="none"
					opacity={layout.mode === "full" ? 1 : 0.45}
					pointerEvents="none"
				/>
			) : null}
			{layout.artworkUrl && layout.artworkKind === "pdf" ? (
				<g
					opacity={layout.mode === "full" ? 1 : 0.45}
					pointerEvents="none"
				>
					<rect x={0} y={0} width={W} height={H} fill="#f1f5f9" />
					<text
						x={W / 2}
						y={H / 2}
						textAnchor="middle"
						fontSize={4}
						fill="#64748b"
					>
						Arte PDF
					</text>
				</g>
			) : null}
			{layout.mode === "data-only" && layout.artworkUrl ? (
				<g pointerEvents="none">
					<rect x={0} y={0} width={W} height={5} fill="#f59e0b" />
					<text
						x={W / 2}
						y={3.6}
						textAnchor="middle"
						fontSize={2.8}
						fontWeight={700}
						fill="#000"
					>
						REFERÊNCIA — NÃO IMPRIME
					</text>
				</g>
			) : null}

			{/* Área livre: fundo real + leve tinta para destacar do crachá */}
			<rect
				x={F.x}
				y={F.y}
				width={F.w}
				height={F.h}
				rx={F.radius}
				fill={layout.freeAreaBg}
				opacity={layout.mode === "full" ? 1 : 0.75}
				pointerEvents="none"
			/>
			<rect
				x={F.x}
				y={F.y}
				width={F.w}
				height={F.h}
				rx={F.radius}
				fill={C_FREE}
				fillOpacity={0.07}
				pointerEvents="none"
			/>

			<g pointerEvents="none">{gridLines}</g>

			{/* Margem interna da área livre */}
			{F.padding > 0 ? (
				<rect
					x={F.x + F.padding}
					y={F.y + F.padding}
					width={Math.max(F.w - F.padding * 2, 0)}
					height={Math.max(F.h - F.padding * 2, 0)}
					fill="none"
					stroke={C_FREE}
					strokeOpacity={0.5}
					strokeWidth={1}
					strokeDasharray="2 3"
					vectorEffect="non-scaling-stroke"
					pointerEvents="none"
				/>
			) : null}

			{/* Conteúdo real (mesma display list da prévia/PDF), sem eventos */}
			{primitives ? (
				<g pointerEvents="none">
					<PrimitiveLayer primitives={primitives} />
				</g>
			) : null}

			{/* Contornos do crachá e da área livre */}
			<Outline
				r={badgeRect}
				color="#334155"
				width={1.5}
				haloWidth={0.01}
			/>
			<Outline r={F} rx={F.radius} color={C_FREE} width={2} dash="7 4" />

			{/* Caixas interativas dos itens */}
			{enabledItems.map((item) => {
				// For QR codes, use square rect (same as display-list)
				const absBase = relativeToBadge(item.rect, F);
				const abs =
					item.kind === "qr"
						? (() => {
								const side = Math.min(absBase.w, absBase.h);
								return {
									x: absBase.x + (absBase.w - side) / 2,
									y: absBase.y + (absBase.h - side) / 2,
									w: side,
									h: side,
								};
							})()
						: absBase;
				const selected = item.id === selectedId;
				const hovered = item.id === hoverId && !selected;
				const showLabel =
					!primitives ||
					(item.kind === "text" && !hasValue(item, sample)) ||
					(item.kind === "logo" && !item.imageUrl);
				return (
					<g
						key={item.id}
						style={{ cursor: "move" }}
						onPointerDown={(e) => begin(e, item.id, "move-item")}
						onPointerEnter={() => setHoverId(item.id)}
						onPointerLeave={() =>
							setHoverId((h) => (h === item.id ? null : h))
						}
					>
						<rect
							x={abs.x}
							y={abs.y}
							width={abs.w}
							height={abs.h}
							fill={
								selected
									? C_ITEM
									: hovered
										? C_ITEM
										: "transparent"
							}
							fillOpacity={selected ? 0.08 : hovered ? 0.06 : 0}
							pointerEvents="all"
						/>
						{selected ? (
							<Outline r={abs} color={C_ITEM} width={2} />
						) : (
							<Outline
								r={abs}
								color={hovered ? C_ITEM : C_ITEM_IDLE}
								width={1.25}
								dash="4 3"
								haloWidth={3.5}
							/>
						)}
						{showLabel ? (
							<text
								x={abs.x + px(4)}
								y={abs.y + px(14)}
								fontSize={px(11)}
								fill="#475569"
								pointerEvents="none"
							>
								{itemLabel(item, fieldLabels)}
							</text>
						) : null}
						<title>{itemLabel(item, fieldLabels)}</title>
					</g>
				);
			})}

			{/* Guias de alinhamento */}
			<g pointerEvents="none">
				{guides.map((g, i) =>
					g.axis === "v" ? (
						<line
							key={i}
							x1={g.position}
							y1={-PAD_MM}
							x2={g.position}
							y2={H + PAD_MM}
							stroke={C_GUIDE}
							strokeWidth={1.25}
							vectorEffect="non-scaling-stroke"
						/>
					) : (
						<line
							key={i}
							x1={-PAD_MM}
							y1={g.position}
							x2={W + PAD_MM}
							y2={g.position}
							stroke={C_GUIDE}
							strokeWidth={1.25}
							vectorEffect="non-scaling-stroke"
						/>
					),
				)}
			</g>

			{/* Aba "Área livre": arraste para mover */}
			<g
				style={{ cursor: "move" }}
				onPointerDown={(e) => begin(e, null, "move-free")}
			>
				<rect
					x={F.x}
					y={tabY}
					width={tabW}
					height={tabH}
					rx={px(4)}
					fill={C_FREE}
				/>
				<text
					x={F.x + px(7)}
					y={tabY + tabH / 2}
					fontSize={tabFont}
					fontWeight={600}
					fill="#fff"
					dominantBaseline="central"
					pointerEvents="none"
				>
					{tabText}
				</text>
			</g>

			{/* Handles da área livre (8) */}
			{renderHandles(
				{ x: F.x, y: F.y, w: F.w, h: F.h },
				HANDLES.map((h) => h.key),
				C_FREE,
				"resize-free",
				null,
			)}

			{/* Item selecionado: chip com nome + handles (por cima de tudo) */}
			{selectedItem && selectedAbs && chip ? (
				<>
					<g pointerEvents="none">
						<rect
							x={chip.x}
							y={chip.y}
							width={chip.w}
							height={tabH}
							rx={px(4)}
							fill={C_ITEM}
						/>
						<text
							x={chip.x + px(6)}
							y={chip.y + tabH / 2}
							fontSize={tabFont}
							fontWeight={600}
							fill="#fff"
							dominantBaseline="central"
						>
							{chip.text}
						</text>
					</g>
					{renderHandles(
						selectedAbs,
						selectedItem.kind === "qr"
							? CORNER_KEYS
							: HANDLES.map((h) => h.key),
						C_ITEM,
						"resize-item",
						selectedItem.id,
					)}
				</>
			) : null}
		</svg>
	);
}
