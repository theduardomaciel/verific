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

import { cn } from "@/lib/utils";

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
	/** Mantido por compatibilidade; o texto agora vem da display list. */
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

interface MmRect {
	x: number;
	y: number;
	w: number;
	h: number;
}

interface DragState {
	mode: DragMode;
	id: string | null;
	/** Ponteiro no início do arrasto (mm). */
	startX: number;
	startY: number;
	/** Retângulo do item no início (mm, coordenadas do crachá). */
	startAbs: MmRect | null;
	startFree: MmRect;
	/** Já empilhou histórico de undo neste arrasto? */
	pushed: boolean;
}

const HANDLE_PX = 10;
const HANDLE_HIT_PX = 20;
const DEAD_ZONE_PX = 3;
const MIN_ITEM_MM = 2;

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
	const drag = useRef<DragState | null>(null);

	const { badgeW: W, badgeH: H, freeArea: F } = layout;

	// Escala real em tela: handles e traços ficam com tamanho constante em px.
	useEffect(() => {
		const el = svgRef.current;
		if (!el) return;
		const update = () => {
			const w = el.getBoundingClientRect().width;
			if (w > 0) setPxPerMm(w / W);
		};
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, [W]);

	const hs = HANDLE_PX / pxPerMm;
	const hit = HANDLE_HIT_PX / pxPerMm;

	const toMm = (clientX: number, clientY: number) => {
		const el = svgRef.current;
		if (!el) return { x: 0, y: 0 };
		const r = el.getBoundingClientRect();
		return {
			x: ((clientX - r.left) / r.width) * W,
			y: ((clientY - r.top) / r.height) * H,
		};
	};

	const begin = (
		e: React.PointerEvent,
		id: string | null,
		mode: DragMode,
	) => {
		e.stopPropagation();
		const svg = svgRef.current;
		svg?.setPointerCapture(e.pointerId);
		svg?.focus({ preventScroll: true });
		const p = toMm(e.clientX, e.clientY);
		const item = id ? layout.items.find((i) => i.id === id) : undefined;
		drag.current = {
			mode,
			id,
			startX: p.x,
			startY: p.y,
			startAbs: item ? relativeToBadge(item.rect, layout.freeArea) : null,
			startFree: {
				x: layout.freeArea.x,
				y: layout.freeArea.y,
				w: layout.freeArea.w,
				h: layout.freeArea.h,
			},
			pushed: false,
		};
		onSelect(id);
	};

	const move = (e: React.PointerEvent) => {
		const d = drag.current;
		if (!d) return;
		const p = toMm(e.clientX, e.clientY);
		const dx = p.x - d.startX;
		const dy = p.y - d.startY;

		// Zona morta: um clique simples não mexe nem suja o histórico.
		const dead = DEAD_ZONE_PX / pxPerMm;
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
		const others = () =>
			layout.items
				.filter((i) => i.enabled && i.id !== d.id)
				.map((i) => relativeToBadge(i.rect, layout.freeArea));

		if (d.mode === "move-item" && d.id && d.startAbs) {
			const id = d.id;
			const item = layout.items.find((i) => i.id === id);
			if (!item) return;
			// Posição BRUTA (início + delta total) → só então encaixa.
			const raw = {
				...d.startAbs,
				x: d.startAbs.x + dx,
				y: d.startAbs.y + dy,
			};
			const snapped = snapRect(
				raw,
				others(),
				{ ...layout.freeArea },
				snapOpts,
			);
			setGuides(snapped.guides);
			const rel = {
				x: (snapped.rect.x - layout.freeArea.x) / layout.freeArea.w,
				y: (snapped.rect.y - layout.freeArea.y) / layout.freeArea.h,
				w: item.rect.w,
				h: item.rect.h,
			};
			apply((draft) => {
				const target = draft.items.find((i) => i.id === id);
				if (target) target.rect = rel;
			});
		} else if (d.mode === "resize-item" && d.id && d.startAbs) {
			const id = d.id;
			const s = d.startAbs;
			// Encaixa o canto inferior direito (ponto de tamanho zero).
			const corner = {
				x: s.x + s.w + dx,
				y: s.y + s.h + dy,
				w: 0,
				h: 0,
			};
			const snapped = snapRect(
				corner,
				others(),
				{ ...layout.freeArea },
				snapOpts,
			);
			setGuides(snapped.guides);
			const newW = Math.max(MIN_ITEM_MM, snapped.rect.x - s.x);
			const newH = Math.max(MIN_ITEM_MM, snapped.rect.y - s.y);
			apply((draft) => {
				const item = draft.items.find((i) => i.id === id);
				if (!item) return;
				item.rect = {
					...item.rect,
					w: newW / draft.freeArea.w,
					h: newH / draft.freeArea.h,
				};
			});
		} else if (d.mode === "move-free") {
			const s = d.startFree;
			apply((draft) => {
				draft.freeArea.x = Math.max(
					0,
					Math.min(draft.badgeW - draft.freeArea.w, s.x + dx),
				);
				draft.freeArea.y = Math.max(
					0,
					Math.min(draft.badgeH - draft.freeArea.h, s.y + dy),
				);
			});
		} else if (d.mode === "resize-free") {
			const s = d.startFree;
			apply((draft) => {
				draft.freeArea.w = Math.max(
					10,
					Math.min(draft.badgeW - draft.freeArea.x, s.w + dx),
				);
				draft.freeArea.h = Math.max(
					10,
					Math.min(draft.badgeH - draft.freeArea.y, s.h + dy),
				);
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
				x: item.rect.x + dx / draft.freeArea.w,
				y: item.rect.y + dy / draft.freeArea.h,
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
					strokeWidth={1}
					vectorEffect="non-scaling-stroke"
					className="stroke-muted-foreground/20"
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
					strokeWidth={1}
					vectorEffect="non-scaling-stroke"
					className="stroke-muted-foreground/20"
				/>,
			);
		}
	}

	const enabledItems = layout.items.filter((i) => i.enabled);
	const selectedItem = enabledItems.find((i) => i.id === selectedId) ?? null;
	const selectedAbs = selectedItem
		? relativeToBadge(selectedItem.rect, F)
		: null;

	return (
		<svg
			ref={svgRef}
			viewBox={`0 0 ${W} ${H}`}
			className="h-auto w-full touch-none rounded-md bg-white shadow-md outline-none select-none"
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
					<rect
						x={0}
						y={0}
						width={W}
						height={H}
						className="fill-muted"
					/>
					<text
						x={W / 2}
						y={H / 2}
						textAnchor="middle"
						fontSize={4}
						className="fill-muted-foreground"
					>
						Arte PDF
					</text>
				</g>
			) : null}
			{layout.mode === "data-only" && layout.artworkUrl ? (
				<g pointerEvents="none">
					<rect
						x={0}
						y={0}
						width={W}
						height={5}
						className="fill-amber-500"
					/>
					<text
						x={W / 2}
						y={3.6}
						textAnchor="middle"
						fontSize={2.8}
						fontWeight={700}
						className="fill-black"
					>
						REFERÊNCIA — NÃO IMPRIME
					</text>
				</g>
			) : null}
			<g pointerEvents="none">{gridLines}</g>

			{/* Área livre: só a borda (e o canto) são arrastáveis */}
			<rect
				x={F.x}
				y={F.y}
				width={F.w}
				height={F.h}
				rx={F.radius}
				fill="none"
				strokeWidth={1}
				strokeDasharray="5 3"
				vectorEffect="non-scaling-stroke"
				className="stroke-blue-500"
				pointerEvents="none"
			/>
			<rect
				x={F.x}
				y={F.y}
				width={F.w}
				height={F.h}
				rx={F.radius}
				fill="none"
				stroke="transparent"
				strokeWidth={14}
				vectorEffect="non-scaling-stroke"
				pointerEvents="stroke"
				className="cursor-move"
				onPointerDown={(e) => begin(e, null, "move-free")}
			/>

			{/* Conteúdo real (mesma display list da prévia/PDF), sem eventos */}
			{primitives ? (
				<g pointerEvents="none">
					<PrimitiveLayer primitives={primitives} />
				</g>
			) : null}

			{/* Caixas interativas dos itens */}
			{enabledItems.map((item) => {
				const abs = relativeToBadge(item.rect, F);
				const selected = item.id === selectedId;
				const showLabel =
					!primitives ||
					(item.kind === "text" && !hasValue(item, sample)) ||
					(item.kind === "logo" && !item.imageUrl);
				return (
					<g
						key={item.id}
						className="group cursor-move"
						onPointerDown={(e) => begin(e, item.id, "move-item")}
					>
						<rect
							x={abs.x}
							y={abs.y}
							width={abs.w}
							height={abs.h}
							fill="transparent"
							pointerEvents="all"
							strokeWidth={selected ? 2 : 1}
							strokeDasharray={selected ? undefined : "3 3"}
							vectorEffect="non-scaling-stroke"
							className={cn(
								selected
									? "stroke-blue-600"
									: "stroke-foreground/25 group-hover:stroke-blue-500",
							)}
						/>
						{showLabel ? (
							<text
								x={abs.x + 0.8}
								y={abs.y + 2.8}
								fontSize={2.2}
								className="fill-muted-foreground"
								pointerEvents="none"
							>
								{itemLabel(item, fieldLabels)}
							</text>
						) : null}
						<title>{itemLabel(item, fieldLabels)}</title>
					</g>
				);
			})}

			{/* Handle de resize do item selecionado (sempre por cima) */}
			{selectedItem && selectedAbs ? (
				<g
					className="cursor-nwse-resize"
					onPointerDown={(e) =>
						begin(e, selectedItem.id, "resize-item")
					}
				>
					<rect
						x={selectedAbs.x + selectedAbs.w - hit / 2}
						y={selectedAbs.y + selectedAbs.h - hit / 2}
						width={hit}
						height={hit}
						fill="transparent"
					/>
					<rect
						x={selectedAbs.x + selectedAbs.w - hs / 2}
						y={selectedAbs.y + selectedAbs.h - hs / 2}
						width={hs}
						height={hs}
						strokeWidth={2}
						vectorEffect="non-scaling-stroke"
						className="fill-white stroke-blue-600"
						pointerEvents="none"
					/>
				</g>
			) : null}

			{/* Handle de resize da área livre */}
			<g
				className="cursor-nwse-resize"
				onPointerDown={(e) => begin(e, null, "resize-free")}
			>
				<rect
					x={F.x + F.w - hit}
					y={F.y + F.h - hit}
					width={hit}
					height={hit}
					fill="transparent"
				/>
				<rect
					x={F.x + F.w - hs}
					y={F.y + F.h - hs}
					width={hs}
					height={hs}
					className="fill-blue-500"
					pointerEvents="none"
				/>
			</g>

			{/* Guias de alinhamento */}
			<g pointerEvents="none">
				{guides.map((g, i) =>
					g.axis === "v" ? (
						<line
							key={i}
							x1={g.position}
							y1={0}
							x2={g.position}
							y2={H}
							strokeWidth={1}
							vectorEffect="non-scaling-stroke"
							className="stroke-rose-500"
						/>
					) : (
						<line
							key={i}
							x1={0}
							y1={g.position}
							x2={W}
							y2={g.position}
							strokeWidth={1}
							vectorEffect="non-scaling-stroke"
							className="stroke-rose-500"
						/>
					),
				)}
			</g>
		</svg>
	);
}
