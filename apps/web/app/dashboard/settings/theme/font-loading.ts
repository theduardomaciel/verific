import { useEffect, useState } from "react";

import {
	buildFontPreviewUrl,
	buildFontStack,
	buildFontStylesheetUrl,
} from "@verific/fonts";
import type { FontCategory } from "@verific/fonts";

export type FontFaceStatus = "loading" | "loaded" | "failed";

/** Pesos/itálico pendentes viram parte da chave p/ recarregar a prévia. */
function fullKey(family: string, weights: number[], italic: boolean): string {
	return `${family}|${[...weights].sort((a, b) => a - b).join(",")}|${italic ? "i" : "n"}`;
}

const previewLinks = new Set<string>();
const fullLinks = new Set<string>();

function appendStylesheet(href: string): void {
	if (typeof document === "undefined") return;
	if (document.querySelector(`link[href="${href}"]`)) return;
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = href;
	document.head.appendChild(link);
}

/**
 * Garante o `text=` com os glifos do nome (lista do picker): baixa só o
 * necessário para renderizar cada item na própria fonte.
 */
export function ensurePreviewStylesheet(family: string): void {
	if (previewLinks.has(family)) return;
	previewLinks.add(family);
	try {
		appendStylesheet(buildFontPreviewUrl(family, family));
	} catch {
		previewLinks.delete(family);
	}
}

/**
 * Garante a fonte completa (pesos selecionados) da família em prévia ou
 * selecionada. Chamadas repetidas com a mesma chave são ignoradas.
 */
export function ensureFullStylesheet(
	family: string,
	weights: number[],
	italic: boolean,
): void {
	const key = fullKey(family, weights, italic);
	if (fullLinks.has(key)) return;
	fullLinks.add(key);
	try {
		appendStylesheet(buildFontStylesheetUrl([{ family, weights, italic }]));
	} catch {
		fullLinks.delete(key);
	}
}

function fontLoadSupported(): boolean {
	return (
		typeof document !== "undefined" &&
		typeof document.fonts?.load === "function"
	);
}

/**
 * Estado da face (p/ skeleton/fallback gracioso). Sem `document.fonts`
 * (SSR/jsdom) considera carregada e usa a pilha de fallback do CSS.
 */
export function useFontFaceStatus(
	family: string,
	weight = 400,
	timeoutMs = 4000,
): FontFaceStatus {
	const [state, setState] = useState<{
		family: string;
		weight: number;
		status: FontFaceStatus;
	}>(() => ({
		family,
		weight,
		status: fontLoadSupported() ? "loading" : "loaded",
	}));
	// Requisição nova (família/peso) reinicia o estado durante o render
	// (padrão React; evita setState síncrono dentro de efeito).
	if (state.family !== family || state.weight !== weight) {
		setState({
			family,
			weight,
			status: fontLoadSupported() ? "loading" : "loaded",
		});
	}

	useEffect(() => {
		if (typeof document === "undefined") return;
		const fonts = document.fonts;
		if (!fonts || typeof fonts.load !== "function") return;
		let cancelled = false;
		const timer = window.setTimeout(() => {
			if (!cancelled) {
				setState((current) => ({ ...current, status: "failed" }));
			}
		}, timeoutMs);
		fonts
			.load(`${state.weight} 16px "${state.family}"`)
			.then((faces) => {
				window.clearTimeout(timer);
				if (!cancelled) {
					setState((current) => ({
						...current,
						status: faces.length > 0 ? "loaded" : "failed",
					}));
				}
			})
			.catch(() => {
				window.clearTimeout(timer);
				if (!cancelled) {
					setState((current) => ({ ...current, status: "failed" }));
				}
			});
		return () => {
			cancelled = true;
			window.clearTimeout(timer);
		};
	}, [state.family, state.weight, timeoutMs]);

	return state.status;
}

/** Pilha CSS da família (fallback pela categoria). */
export function fontStack(family: string, category?: FontCategory): string {
	return buildFontStack(family, category);
}
