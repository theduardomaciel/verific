import type * as React from "react";
import Link from "next/link";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

import Logo from "@/public/logo.svg";

const footerVariants = cva(
	"flex items-center px-8 justify-center w-full py-6 ",
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
			<div className="container-p flex w-full flex-row flex-wrap items-start justify-start gap-4 md:items-center md:justify-between">
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
							className="text-xs transition-colors hover:opacity-80"
						>
							Ajuda
						</Link>
						<Link
							href="/privacy"
							className="text-xs transition-colors hover:opacity-80"
						>
							Política de Privacidade
						</Link>
						<Link
							href="/terms"
							className="text-xs transition-colors hover:opacity-80"
						>
							Termos de Uso
						</Link>
					</nav>
				</div>
				<p className="text-xs text-[currentColor] opacity-50">
					Copyright 2025 verifIC. Todos os direitos reservados
				</p>
			</div>
		</footer>
	);
}

export { Footer, footerVariants };
