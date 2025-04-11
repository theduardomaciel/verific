import type * as React from "react";
import Link from "next/link";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

import Logo from "@/public/logo.svg";

const footerVariants = cva(
	"flex items-center justify-center w-full py-6 px-8 ",
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
		<footer className={cn(footerVariants({ variant, className }))} {...props}>
			<div className="flex flex-row flex-wrap items-start justify-start md:justify-between gap-4 w-full">
				<div className="flex flex-row flex-wrap items-center justify-start gap-3 md:gap-8 xs:justify-between max-md:w-full">
					{/* Brand */}
					<div className="flex items-center gap-3">
						{showWatermark && (
							<>
								<span className="text-sm font-medium">
									Feito com tecnologia
								</span>
								<div className="w-[1px] h-3 bg-foreground rounded-full hidden md:flex" />
							</>
						)}
						<Logo />
					</div>
					{/* Links */}
					<nav className="flex gap-6">
						<Link
							href="#"
							className="text-xs text-gray-600 hover:text-gray-900"
						>
							Ajuda
						</Link>
						<Link
							href="#"
							className="text-xs text-gray-600 hover:text-gray-900"
						>
							Política de Privacidade
						</Link>
						<Link
							href="#"
							className="text-xs text-gray-600 hover:text-gray-900"
						>
							Termos de Uso
						</Link>
					</nav>
				</div>
				<p className="text-xs text-gray-500">
					Copyright 2025 verifIC. Todos os direitos reservados
				</p>
			</div>
		</footer>
	);
}

export { Footer, footerVariants };
