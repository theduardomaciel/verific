/**
 * Identificadores estáveis dos controles do `DynamicField`, derivados do
 * `name` do campo no React Hook Form (ex.: `answers.nome` -> `answers-nome`).
 * Pontos e outros caracteres são normalizados porque o id precisa valer
 * como `href="#..."` (âncora do resumo de erros) e como `htmlFor`.
 *
 * Restrição consciente: o id é determinístico, então o mesmo `name` não
 * pode ser renderizado duas vezes na mesma página (ids duplicados
 * quebram `htmlFor`, âncoras e `aria-describedby`). Todos os usos atuais
 * (`activity-enrollment-form`, `JoinForm`, `EditAnswersForm`, preview do
 * dashboard) renderizam cada nome uma única vez por página. Se uma página
 * um dia precisar de duas cópias do mesmo formulário, adicione um
 * `idPrefix` opcional ao `DynamicField` e prefixe o resultado daqui.
 */
export function getFieldId(name: string): string {
	const clean = name
		.replace(/[^A-Za-z0-9-_]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");
	return clean || "campo";
}

const FOCUSABLE_SELECTOR =
	'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Rola até o controle e foca nele. Em controles agrupados (o id está no
 * grupo), foca o primeiro item focalizável.
 */
export function focusFieldControl(id: string): void {
	const root = document.getElementById(id);
	if (!root) return;

	root.scrollIntoView({
		behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
			? "auto"
			: "smooth",
		block: "center",
	});

	const target =
		root instanceof HTMLElement && root.matches(FOCUSABLE_SELECTOR)
			? root
			: root.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
	target?.focus({ preventScroll: true });
}
