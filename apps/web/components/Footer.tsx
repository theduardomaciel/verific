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
				landing: "bg-transparent text-foreground",
				dashboard: "bg-transparent text-foreground border-t",
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
			className={cn(footerVariants({ variant, className }))}
			{...props}
		>
			<div className="flex w-full flex-row flex-wrap items-start justify-start gap-4 md:justify-between">
				<div className="xs:justify-between flex flex-row flex-wrap items-center justify-start gap-3 max-md:w-full md:gap-8">
					{/* Brand */}
					<div className="flex items-center gap-3">
						{showWatermark && (
							<>
								<span className="text-sm font-medium">
									Feito com tecnologia
								</span>
								<div className="bg-foreground hidden h-3 w-[1px] rounded-full md:flex" />
							</>
						)}
						<Logo className="text-foreground h-5" />
					</div>
					{/* Links */}
					<nav className="flex gap-6">
						<Link
							href="#"
							className="text-foreground hover:text-muted-foreground text-xs transition-colors"
						>
							Ajuda
						</Link>
						<Link
							href="#"
							className="text-foreground hover:text-muted-foreground text-xs transition-colors"
						>
							Política de Privacidade
						</Link>
						<Link
							href="#"
							className="text-foreground hover:text-muted-foreground text-xs transition-colors"
						>
							Termos de Uso
						</Link>
					</nav>
				</div>
				<p className="text-foreground/50 text-xs">
					Copyright 2025 verifIC. Todos os direitos reservados
				</p>
			</div>
		</footer>
	);
}

export { Footer, footerVariants };
