import Link from "next/link";
import type * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import Logo from "@/public/logo.svg";

const footerVariants = cva(
	"flex items-center justify-center w-full py-6 px-container-h",
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
 * Ano do copyright, atualizado manualmente: ler a data exigiria uma entrada
 * de cache em toda página com rodapé.
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
						<Link href="/" prefetch={false}>
							<Logo className="h-5" />
						</Link>
					</div>
					{showWatermark && (
						<div className="hidden h-3 w-px rounded-full bg-[currentColor] md:flex" />
					)}
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
