"use client";

import { useEffect } from "react";

/**
 * Espelha as variáveis do tema do evento no `<html>` enquanto a rota de
 * evento está montada.
 *
 * Por quê: `DialogContent`, `Toaster` (sonner) e `NextTopLoader` renderizam
 * fora da `div` temada do layout (portals em `document.body` / `fixed` no
 * topo). Sem isso eles enxergam apenas as cores globais. O modo
 * claro/escuro NÃO é forçado aqui: páginas de evento seguem o `next-themes`
 * (preferência do visitante/sistema).
 *
 * O `<style>` com `:root` no layout já cobre o primeiro paint (SSR); este
 * efeito mantém as vars sincronizadas em navegações SPA. Na desmontagem,
 * restaura os valores anteriores.
 */
export function EventThemeSync({
	cssVars,
}: {
	cssVars: Record<string, string>;
}) {
	useEffect(() => {
		const root = document.documentElement;
		const previous: Record<string, string | null> = {};
		for (const [key, value] of Object.entries(cssVars)) {
			previous[key] = root.style.getPropertyValue(key) || null;
			root.style.setProperty(key, value);
		}

		return () => {
			for (const [key, prev] of Object.entries(previous)) {
				if (prev === null) root.style.removeProperty(key);
				else root.style.setProperty(key, prev);
			}
		};
	}, [cssVars]);

	return null;
}
