import Link from "next/link";
import type * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import Logo from "@/public/logo.svg";

const footerVariants = cva(
	"flex items-center justify-center w-full py-6 px-12",
	{
		variants: {
			variant: {
				landing: "bg-transparent",
				dashboard: "bg-transparent border-t",
			},
		},
		defaultVariants: {
			variant: "dashboard",
		},
	},
);

/**
 * Ano do copyright como constante estática — atualizada manualmente.
 *
 * Antes vinha de `new Date().getFullYear()` dentro de um `"use cache"`
 * só para congelar o valor: uma entrada de cache (com `cacheLife`) em
 * toda página que renderiza o rodapé, e a virada do ano invalidava a
 * entrada de todas elas. Estático: nenhuma leitura de dado, nenhuma
 * entrada de cache, nenhuma surpresa.
 */
const COPYRIGHT_YEAR = 2026;

/**
 * Rodapé.
 *
 * Cores: o `text-foreground` base e o `text-(--ev-footer-fg)` passado
 * pela página do evento são resolvidos corretamente pelo `tailwind-merge`
 * (o utilitário arbitrário posterior vence o `text-foreground`), então a
 * cor do evento chega ao rodapé sem precisar de variante ou atributo extra.
 * O copyright usa `--ev-footer-fg-soft`, derivado para passar AA sobre o
 * fundo do rodapé — o antigo `opacity-50` sobre `text-xs` reprovava.
 */
function Footer({
	className,
	variant,
	showWatermark = false,
	...props
}: React.ComponentProps<"footer"> &
	VariantProps<typeof footerVariants> & {
		showWatermark?: boolean;
	}) {
	return (
		<footer
			className={cn(
				"text-foreground",
				footerVariants({ variant, className }),
			)}
			{...props}
		>
			<div className="flex w-full flex-row flex-wrap items-start justify-start gap-4 md:items-center md:justify-between">
				<div className="xs:justify-between flex flex-row flex-wrap items-center justify-start gap-3 max-md:w-full md:gap-8">
					{/* Brand */}
					<div className="flex items-center gap-3">
						{showWatermark && (
							<span className="text-sm font-medium">
								Feito com tecnologia
							</span>
						)}
						<Link href={`/`}>
							<Logo className="h-5" />
						</Link>
					</div>
					{showWatermark && (
						<div className="hidden h-3 w-[1px] rounded-full bg-[currentColor] md:flex" />
					)}
					{/* Links */}
					<nav className="flex flex-row flex-wrap gap-2 space-x-2 md:space-x-4">
						<Link
							href="/help"
							className="text-xs transition-opacity hover:opacity-80"
						>
							Ajuda
						</Link>
						<Link
							href="/privacy"
							className="text-xs transition-opacity hover:opacity-80"
						>
							Política de Privacidade
						</Link>
						<Link
							href="/terms"
							className="text-xs transition-opacity hover:opacity-80"
						>
							Termos de Uso
						</Link>
					</nav>
				</div>
				<p className="text-xs text-(--ev-footer-fg-soft,var(--muted-foreground))">
					Copyright {COPYRIGHT_YEAR} verifIC. Todos os direitos
					reservados
				</p>
			</div>
		</footer>
	);
}

export { Footer, footerVariants };
