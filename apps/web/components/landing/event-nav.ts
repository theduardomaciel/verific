/**
 * Classes compartilhadas da navegação pública do evento.
 *
 * Módulo sem JSX e sem `"use client"` de propósito: precisa ser importável
 * ao mesmo tempo por componentes cliente (`MobileMenu`, prévia do editor) e
 * pelo `EventHeader` (server), sem criar uma fronteira de módulo cliente.
 *
 * Todas as cores vêm dos tokens derivados server-side (`resolve.ts`), então
 * não há cor de papel, `dark:` nem `!` aqui — só forma e os tokens.
 */

/** Link comum do menu mobile do evento. */
export const MOBILE_NAV_CLASS = "text-[var(--ev-mobile-menu-fg)]";

/**
 * Bloco do CTA de inscrição no menu mobile: mesmos tokens do CTA do
 * cabeçalho, em caixa cheia. Reaproveita o estado de hover dele porque é o
 * mesmo preenchimento — no mobile não existe hover para "descansar".
 */
export const MOBILE_CTA_CLASS =
	"w-full rounded-md border border-[var(--ev-cta-border)] bg-[var(--ev-cta-hover-bg)] px-4 py-3 text-center text-sm font-semibold text-[var(--ev-cta-hover-fg)] uppercase";

/**
 * Botão de abrir/fechar o menu no cabeçalho do evento: lê a cor da
 * navegação em vez de `text-primary bg-primary/10`, que sumia sobre um
 * cabeçalho claro.
 */
export const EVENT_MENU_BUTTON_CLASS =
	"text-[var(--ev-nav-fg)] hover:bg-[var(--ev-nav-hover-bg)] hover:text-[var(--ev-nav-hover-fg)]";

/** Formatação (não cor) do CTA no cabeçalho do evento. */
export const EVENT_CTA_CLASS = "border font-semibold text-xs uppercase";
