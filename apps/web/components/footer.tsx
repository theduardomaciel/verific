import type * as React from "react";
import Link from "next/link";

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
 * Ano corrente com `"use cache"`: o valor é congelado pela entrada do
 * cache em vez de mudar a cada requisição (o que invalidaria o cache de
 * toda a página). Server component por isso — precisa ser aguardado, não
 * renderizado como filho.
 */
async function getRenderedYear() {
	"use cache";
	return new Date().getFullYear();
}

/**
 * Rodapé. Server component (async) porque o ano vem de uma função cacheada:
 * num componente síncrono, `getRenderedYear()` era Interpolada no JSX como
 * uma promise não resolvida, e o React a rejeitava como objeto inválido.
 *
 * Cores: o `text-foreground` base e o `text-[var(--ev-footer-fg)]` passado
 * pela página do evento são resolvidos corretamente pelo `tailwind-merge`
 * (o utilitário arbitrário posterior vence o `text-foreground`), então a
 * cor do evento chega ao rodapé sem precisar de variante ou atributo extra.
 * O copyright usa `--ev-footer-fg-soft`, derivado para passar AA sobre o
 * fundo do rodapé — o antigo `opacity-50` sobre `text-xs` reprovava.
 */
async function Footer({
	className,
	variant,
	showWatermark = false,
	...props
}: React.ComponentProps<"footer"> &
	VariantProps<typeof footerVariants> & {
		showWatermark?: boolean;
	}) {
	const year = await getRenderedYear();

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
				<p className="text-[var(--ev-footer-fg-soft,var(--muted-foreground))] text-xs">
					Copyright {year} verifIC. Todos os direitos reservados
				</p>
			</div>
		</footer>
	);
}

export { Footer, footerVariants };
