import { relativeToBadge } from "./coords";
import { fitTextLines } from "./text-fit";

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
	// Cada caixa mantém seu espaço designado: linhas vazias são omitidas
	// sem deslocar as demais (consistência visual entre crachás).

	for (const item of layout.items) {
		if (!item.enabled) continue;
		if (item.kind === "text") {
			const value =
				item.source === "name"
					? data.name
					: (data.fields[item.source] ?? "").trim();
			if (!value) continue;
			const abs = relativeToBadge(item.rect, layout.freeArea);
			const family = options.fontFamilyForRole(item.fontRole);
			const scale = options.scaleForRole(item.fontRole);
			const startSize = item.fontSizePt * scale;
			const minSize = Math.min(item.minFontSizePt * scale, startSize);
			const maxWidthMm = abs.w;
			// measure() devolve largura na mesma unidade de maxWidth/maxHeight.
			const fitted = fitTextLines({
				text: value,
				maxWidth: maxWidthMm,
				maxHeight: abs.h,
				fontSizePt: startSize,
				minFontSizePt: minSize,
				maxLines: item.maxLines,
				measure: (t, s) => options.measure(t, family, item.weight, s),
			});
			out.push({
				kind: "text",
				xMm: abs.x,
				yMm: abs.y,
				maxWidthMm: abs.w,
				lines: fitted.lines,
				fontRole: item.fontRole,
				family,
				fontSizePt: Math.round(fitted.fontSizePt * 10) / 10,
				weight: item.weight,
				color: hexToCss(item.color),
				align: item.align,
				lineHeightPt: Math.round(fitted.fontSizePt * 1.2 * 10) / 10,
			});
		} else if (item.kind === "qr") {
			const abs = relativeToBadge(item.rect, layout.freeArea);
			// Keep square, fit inside.
			const side = Math.min(abs.w, abs.h);
			const square: Rect = {
				x: abs.x + (abs.w - side) / 2,
				y: abs.y + (abs.h - side) / 2,
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
				rect: { ...abs },
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
