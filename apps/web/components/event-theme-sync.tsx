"use client";

import { useEffect } from "react";

/**
 * Espelha as variáveis do tema do evento no `<html>` enquanto a rota de
 * evento está montada.
 *
 * Por quê: `DialogContent`, `Toaster` (sonner) e `NextTopLoader` renderizam
 * fora da `div` temada do layout (portals em `document.body` / `fixed` no
 * topo). Sem isso eles enxergam apenas as cores globais e o modo claro,
 * ignorando `--primary`/`--secondary` do evento e o `dark` forçado da página.
 *
 * O `<style>` com `:root` no layout já cobre o primeiro paint (SSR); este
 * efeito garante a classe `dark` (que o `<style>` não pode forçar sem
 * duplicar os tokens) e mantém as vars sincronizadas em navegações SPA.
 * Na desmontagem, restaura os valores anteriores.
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

		const hadDark = root.classList.contains("dark");
		if (!hadDark) root.classList.add("dark");

		return () => {
			for (const [key, prev] of Object.entries(previous)) {
				if (prev === null) root.style.removeProperty(key);
				else root.style.setProperty(key, prev);
			}
			if (!hadDark) root.classList.remove("dark");
		};
	}, [cssVars]);

	return null;
}
