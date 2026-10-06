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
export const MOBILE_NAV_CLASS = "text-(--ev-mobile-menu-fg)";

/**
 * Bloco do CTA de inscrição no menu mobile: mesmos tokens do CTA do
 * cabeçalho, em caixa cheia. Reaproveita o estado de hover dele porque é o
 * mesmo preenchimento — no mobile não existe hover para "descansar".
 */
export const MOBILE_CTA_CLASS =
	"w-full rounded-md border border-(--ev-cta-border) bg-(--ev-cta-hover-bg) px-4 py-3 text-center text-sm font-semibold text-(--ev-cta-hover-fg) uppercase";

/**
 * Botão de abrir/fechar o menu no cabeçalho do evento: lê a cor da
 * navegação em vez de `text-primary bg-primary/10`, que sumia sobre um
 * cabeçalho claro.
 */
export const EVENT_MENU_BUTTON_CLASS =
	"text-(--ev-nav-fg) hover:bg-(--ev-nav-hover-bg) hover:text-(--ev-nav-hover-fg)";

/** Formatação (não cor) do CTA no cabeçalho do evento. */
export const EVENT_CTA_CLASS = "border font-semibold text-xs uppercase";

/**
 * Cor dos selos da capa do evento: superfície de conteúdo
 * (`content.accent`, com `accentDark` no escuro). O ícone herda a cor do
 * texto (`currentColor`). Tamanho/arredondamento ficam em cada uso.
 */
export const EVENT_BADGE_COLORS =
	"bg-(--ev-badge-bg) text-(--ev-badge-fg) dark:bg-(--ev-badge-bg-dark) dark:text-(--ev-badge-fg-dark)";
