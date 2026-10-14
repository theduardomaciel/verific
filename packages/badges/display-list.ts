import { relativeToBadge } from "./coords";
import { LINE_HEIGHT, fitTextLines } from "./text-fit";

import type { Rect } from "./coords";
import type { BadgeLayout } from "./schema";

/**
 * Single render path: layout + participant data + fonts → display list of
 * primitives. Both the SVG/DOM preview and the PDF writer consume it.
 * All coordinates in mm (badge space, top-left origin). Text fitting uses
 * the injected measure fn (same TTF bytes as the PDF), never DOM measure.
 */

export interface ParticipantBadgeData {
	name: string;
	/** Secondary source id → display value (absent/empty = omit line). */
	fields: Record<string, string>;
	qrPayload: string;
}

export type DisplayPrimitive =
	| { kind: "rect"; rect: Rect; fill: string; radiusMm: number }
	| {
			kind: "text";
			xMm: number;
			yMm: number;
			maxWidthMm: number;
			maxLines: number;
			lines: string[];
			fontRole: "heading" | "subtitle" | "body";
			/** Resolved font family (theme role → family). */
			family: string;
			fontSizePt: number;
			weight: number;
			color: string;
			align: "left" | "center" | "right";
			lineHeightPt: number;
	  }
	| {
			kind: "qr";
			rect: Rect;
			/** Boolean matrix (true = dark module), without quiet zone. */
			modules: boolean[][];
			quietModules: number;
	  }
	| { kind: "image"; rect: Rect; url: string };

export interface DisplayListOptions {
	measure: (
		text: string,
		family: string,
		weight: number,
		sizePt: number,
	) => number;
	/** Resolve theme font family per role. */
	fontFamilyForRole: (role: "heading" | "subtitle" | "body") => string;
	/** Per-font scale multiplier from the theme (1 = natural). */
	scaleForRole: (role: "heading" | "subtitle" | "body") => number;
	/** Encode payload → boolean matrix. Injected for testability. */
	encodeQr: (payload: string) => boolean[][];
}

function hexToCss(hex: string): string {
	return hex;
}

export function buildDisplayList(
	layout: BadgeLayout,
	data: ParticipantBadgeData,
	options: DisplayListOptions,
): DisplayPrimitive[] {
	const out: DisplayPrimitive[] = [];
	const hasText = (
		item: Extract<BadgeLayout["items"][number], { kind: "text" }>,
	) =>
		item.source === "name"
			? data.name.trim().length > 0
			: (data.fields[item.source] ?? "").trim().length > 0;

	// "Projetado": o que apareceria com todos os dados preenchidos.
	const designed = layout.items.filter((item) => {
		if (!item.enabled) return false;
		if (item.kind === "text")
			return item.source === "name" || !!item.source;
		if (item.kind === "logo") return !!item.imageUrl;
		return true;
	});
	const present = designed.filter((item) =>
		item.kind === "text" ? hasText(item) : true,
	);

	const extent = (items: typeof designed) => {
		let top = Number.POSITIVE_INFINITY;
		let bottom = Number.NEGATIVE_INFINITY;
		for (const item of items) {
			const r = relativeToBadge(item.rect, layout.freeArea);
			top = Math.min(top, r.y);
			bottom = Math.max(bottom, r.y + r.h);
		}
		return { top, bottom };
	};

	// Fecha o espaço de linhas ausentes e centraliza o grupo restante na
	// faixa vertical do layout completo. Deslocamento por item.
	const rectOf = (item: (typeof designed)[number]) =>
		relativeToBadge(item.rect, layout.freeArea);
	const dyById = new Map<string, number>();
	if (
		layout.missingFieldBehavior === "recenter" &&
		present.length > 0 &&
		present.length < designed.length
	) {
		const eps = 1e-6;
		const missing = designed
			.filter((i) => !present.includes(i))
			.map(rectOf);
		const collapsed = present.map((item) => {
			const r = rectOf(item);
			// Soma a altura das caixas ausentes inteiramente acima do item.
			const up = missing.reduce(
				(sum, m) => (m.y + m.h <= r.y + eps ? sum + m.h : sum),
				0,
			);
			return { item, up, top: r.y - up, bottom: r.y + r.h - up };
		});
		const top = Math.min(...collapsed.map((c) => c.top));
		const bottom = Math.max(...collapsed.map((c) => c.bottom));
		const full = extent(designed);
		const wanted = (full.top + full.bottom) / 2 - (top + bottom) / 2;
		const F = layout.freeArea;
		// Se o próprio layout já passa da margem interna, permite esse limite.
		const lo = Math.min(F.y + F.padding, full.top) - top;
		const hi = Math.max(F.y + F.h - F.padding, full.bottom) - bottom;
		const shift = lo <= hi ? Math.min(Math.max(wanted, lo), hi) : 0;
		for (const c of collapsed) dyById.set(c.item.id, shift - c.up);
	}
	const dyOf = (item: { id: string }) => dyById.get(item.id) ?? 0;

	for (const item of layout.items) {
		if (!item.enabled) continue;
		if (item.kind === "text") {
			const value =
				item.source === "name"
					? data.name
					: (data.fields[item.source] ?? "").trim();
			if (!value) continue;
			const abs = relativeToBadge(item.rect, layout.freeArea);
			// Use item's family if specified, otherwise fall back to role's family
			const family =
				item.family || options.fontFamilyForRole(item.fontRole);
			const scale = options.scaleForRole(item.fontRole);
			const startSize = item.fontSizePt * scale;
			const minSize = Math.min(item.minFontSizePt * scale, startSize);
			const maxWidthMm = abs.w;
			// Measure closure converts mm budget to the measure fn's unit.
			// measure() works in pt; convert mm→pt via 72/25.4 inside caller.
			const fitted = fitTextLines({
				text: value,
				maxWidth: maxWidthMm,
				maxHeight: abs.h,
				fontSizePt: startSize,
				minFontSizePt: minSize,
				maxLines: item.maxLines,
				measure: (t, s) => options.measure(t, family, item.weight, s),
			});
			// Centraliza o bloco verticalmente dentro da caixa do item.
			const slackMm = Math.max(0, abs.h - fitted.heightMm);
			out.push({
				kind: "text",
				xMm: abs.x,
				yMm: abs.y + slackMm / 2 + dyOf(item),
				maxWidthMm: abs.w,
				maxLines: item.maxLines,
				lines: fitted.lines,
				fontRole: item.fontRole,
				family,
				// Sem re-arredondar: o tamanho ajustado é o que preview e PDF usam.
				fontSizePt: fitted.fontSizePt,
				weight: item.weight,
				color: hexToCss(item.color),
				align: item.align,
				lineHeightPt: fitted.fontSizePt * LINE_HEIGHT,
			});
		} else if (item.kind === "qr") {
			const abs = relativeToBadge(item.rect, layout.freeArea);
			// Keep square, fit inside.
			const side = Math.min(abs.w, abs.h);
			const square: Rect = {
				x: abs.x + (abs.w - side) / 2,
				y: abs.y + (abs.h - side) / 2 + dyOf(item),
				w: side,
				h: side,
			};
			out.push({
				kind: "qr",
				rect: square,
				modules: options.encodeQr(data.qrPayload),
				quietModules: item.quietModules,
			});
		} else if (item.kind === "logo") {
			if (!item.imageUrl) continue;
			const abs = relativeToBadge(item.rect, layout.freeArea);
			out.push({
				kind: "image",
				rect: { ...abs, y: abs.y + dyOf(item) },
				url: item.imageUrl,
			});
		}
	}
	return out;
}

/** Minimum QR side warning floor (~20mm recommended). */
export const QR_MIN_SIDE_MM = 20;

export function qrSizeWarnings(sideMm: number): string[] {
	const warnings: string[] = [];
	if (sideMm < QR_MIN_SIDE_MM) {
		warnings.push(
			`QR com ${sideMm.toFixed(1)}mm — recomendado mínimo de ${QR_MIN_SIDE_MM}mm para leitura confiável.`,
		);
	}
	return warnings;
}
