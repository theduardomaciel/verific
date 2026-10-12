"use client";

import { useRef, useState } from "react";

import {
	relativeToBadge,
	snapRect,
	type BadgeItem,
	type BadgeLayout,
	type Guide,
} from "@verific/badges";

import { cn } from "@/lib/utils";

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
	roles: ThemeFontRoles;
	sample: { name: string; fields: Record<string, string> };
	fieldLabels: Map<string, string>;
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	/** pushHistory=true snapshots undo before applying (drag start, keys). */
	onPatch: (fn: (draft: BadgeLayout) => void, pushHistory?: boolean) => void;
	snap: SnapSettings;
	showGrid: boolean;
}

function itemLabel(item: BadgeItem, fieldLabels: Map<string, string>): string {
	if (item.kind === "qr") return "QR";
	if (item.kind === "logo") return "Logo";
	if (item.source === "name") return "Nome";
	if (!item.source) return item.label || "Linha";
	return fieldLabels.get(item.source) ?? item.label ?? "Linha";
}

function itemSample(
	item: BadgeItem,
	sample: Props["sample"],
	fieldLabels: Map<string, string>,
): string {
	if (item.kind !== "text") return "";
	if (item.source === "name") return sample.name;
	if (!item.source) return "—";
	return sample.fields[item.source] || "—";
}

export function BadgeCanvas({
	layout,
	roles,
	sample,
	fieldLabels,
	selectedId,
	onSelect,
	onPatch,
	snap,
	showGrid,
}: Props) {
	const svgRef = useRef<SVGSVGElement>(null);
	const [guides, setGuides] = useState<Guide[]>([]);
	const drag = useRef<null | {
		id: string | null;
		mode: "move-item" | "resize-item" | "move-free" | "resize-free";
		lastX: number;
		lastY: number;
	}>(null);

	const { badgeW: W, badgeH: H, freeArea: F } = layout;

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
		mode: NonNullable<typeof drag.current>["mode"],
	) => {
		e.stopPropagation();
		(el(e) as Element).setPointerCapture?.(e.pointerId);
		const p = toMm(e.clientX, e.clientY);
		onPatch(() => {}, true);
		drag.current = { id, mode, lastX: p.x, lastY: p.y };
		onSelect(id);
	};

	const el = (e: React.PointerEvent) => e.target as unknown as Element;

	const move = (e: React.PointerEvent) => {
		const d = drag.current;
		if (!d) return;
		const p = toMm(e.clientX, e.clientY);
		const dx = p.x - d.lastX;
		const dy = p.y - d.lastY;
		d.lastX = p.x;
		d.lastY = p.y;
		if (dx === 0 && dy === 0) return;

		const snapOpts = {
			gridSizeMm: snap.gridSizeMm,
			gridOn: snap.gridOn,
			toleranceMm: snap.toleranceMm,
			snapToItems: snap.snapItems,
			snapToFreeArea: snap.snapFree,
		};

		if (d.mode === "move-item" && d.id) {
			const id = d.id;
			onPatch((draft) => {
				const item = draft.items.find((i) => i.id === id);
				if (!item) return;
				const abs = relativeToBadge(item.rect, draft.freeArea);
				const moved = { ...abs, x: abs.x + dx, y: abs.y + dy };
				const { rect, guides } = snapRect(
					moved,
					layout.items
						.filter((i) => i.enabled && i.id !== id)
						.map((i) => relativeToBadge(i.rect, draft.freeArea)),
					{ ...draft.freeArea },
					snapOpts,
				);
				setGuides(guides);
				const fw = draft.freeArea.w;
				const fh = draft.freeArea.h;
				item.rect = {
					x: (rect.x - draft.freeArea.x) / fw,
					y: (rect.y - draft.freeArea.y) / fh,
					w: item.rect.w,
					h: item.rect.h,
				};
			});
		} else if (d.mode === "resize-item" && d.id) {
			const id = d.id;
			onPatch((draft) => {
				const item = draft.items.find((i) => i.id === id);
				if (!item) return;
				item.rect = {
					...item.rect,
					w: Math.max(0.05, item.rect.w + dx / draft.freeArea.w),
					h: Math.max(0.05, item.rect.h + dy / draft.freeArea.h),
				};
			});
		} else if (d.mode === "move-free") {
			onPatch((draft) => {
				draft.freeArea.x = Math.max(
					0,
					Math.min(
						draft.badgeW - draft.freeArea.w,
						draft.freeArea.x + dx,
					),
				);
				draft.freeArea.y = Math.max(
					0,
					Math.min(
						draft.badgeH - draft.freeArea.h,
						draft.freeArea.y + dy,
					),
				);
			});
		} else if (d.mode === "resize-free") {
			onPatch((draft) => {
				draft.freeArea.w = Math.max(
					10,
					Math.min(
						draft.badgeW - draft.freeArea.x,
						draft.freeArea.w + dx,
					),
				);
				draft.freeArea.h = Math.max(
					10,
					Math.min(
						draft.badgeH - draft.freeArea.y,
						draft.freeArea.h + dy,
					),
				);
			});
		}
	};

	const end = () => {
		drag.current = null;
		setGuides([]);
	};

	const nudge = (e: React.KeyboardEvent) => {
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
					strokeWidth={0.15}
					className="stroke-muted-foreground/30"
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
					strokeWidth={0.15}
					className="stroke-muted-foreground/30"
				/>,
			);
		}
	}

	return (
		<svg
			ref={svgRef}
			viewBox={`0 0 ${W} ${H}`}
			className="h-auto w-full touch-none rounded-md bg-white shadow-md outline-none"
			onPointerMove={move}
			onPointerUp={end}
			onPointerCancel={end}
			onPointerDown={() => onSelect(null)}
			onKeyDown={nudge}
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
				/>
			) : null}
			{layout.artworkUrl && layout.artworkKind === "pdf" ? (
				<g opacity={layout.mode === "full" ? 1 : 0.45}>
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
				<g>
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
			{gridLines}
			{/* Free area */}
			<g
				onPointerDown={(e) => begin(e, null, "move-free")}
				className="cursor-move"
			>
				<rect
					x={F.x}
					y={F.y}
					width={F.w}
					height={F.h}
					rx={F.radius}
					fill="transparent"
					strokeWidth={0.4}
					className="stroke-blue-500"
					strokeDasharray="1.5 1"
				/>
				<rect
					x={F.x + F.w - 1.6}
					y={F.y + F.h - 1.6}
					width={1.6}
					height={1.6}
					className="fill-blue-500"
					onPointerDown={(e) => begin(e, null, "resize-free")}
				/>
			</g>
			{/* Items */}
			{layout.items
				.filter((i) => i.enabled)
				.map((item) => {
					const abs = relativeToBadge(item.rect, F);
					const selected = item.id === selectedId;
					return (
						<g
							key={item.id}
							onPointerDown={(e) =>
								begin(e, item.id, "move-item")
							}
							className="cursor-move"
						>
							{item.kind === "text" ? (
								<text
									x={
										item.align === "center"
											? abs.x + abs.w / 2
											: item.align === "right"
												? abs.x + abs.w
												: abs.x
									}
									y={abs.y + item.fontSizePt * 0.3528}
									textAnchor={
										item.align === "center"
											? "middle"
											: item.align === "right"
												? "end"
												: "start"
									}
									fontFamily={`"${roles[item.fontRole].family}", sans-serif`}
									fontSize={item.fontSizePt * 0.3528}
									fontWeight={item.weight}
									fill={item.color}
									style={{
										whiteSpace: "pre",
										overflow: "hidden",
									}}
								>
									{itemSample(
										item,
										sample,
										fieldLabels,
									).slice(0, 60)}
								</text>
							) : null}
							{item.kind === "qr" ? (
								<g>
									<rect
										x={abs.x}
										y={abs.y}
										width={abs.w}
										height={abs.h}
										fill="#fff"
										strokeWidth={0.3}
										className="stroke-foreground"
									/>
									<rect
										x={abs.x + abs.w * 0.2}
										y={abs.y + abs.h * 0.2}
										width={abs.w * 0.6}
										height={abs.h * 0.6}
										fill="none"
										strokeWidth={0.3}
										className="stroke-foreground"
									/>
									<text
										x={abs.x + abs.w / 2}
										y={abs.y + abs.h + 2.4}
										textAnchor="middle"
										fontSize={2.4}
										className="fill-muted-foreground"
									>
										QR
									</text>
								</g>
							) : null}
							<rect
								x={abs.x}
								y={abs.y}
								width={abs.w}
								height={abs.h}
								fill="transparent"
								strokeWidth={selected ? 0.5 : 0.25}
								className={cn(
									selected
										? "stroke-blue-600"
										: "stroke-foreground/40",
								)}
							/>
							{selected ? (
								<rect
									x={abs.x + abs.w - 1.4}
									y={abs.y + abs.h - 1.4}
									width={1.4}
									height={1.4}
									className="fill-blue-600"
									onPointerDown={(e) =>
										begin(e, item.id, "resize-item")
									}
								/>
							) : null}
							<title>{itemLabel(item, fieldLabels)}</title>
						</g>
					);
				})}
			{guides.map((g, i) =>
				g.axis === "v" ? (
					<line
						key={i}
						x1={g.position}
						y1={0}
						x2={g.position}
						y2={H}
						strokeWidth={0.3}
						className="stroke-rose-500"
					/>
				) : (
					<line
						key={i}
						x1={0}
						y1={g.position}
						x2={W}
						y2={g.position}
						strokeWidth={0.3}
						className="stroke-rose-500"
					/>
				),
			)}
		</svg>
	);
}
