import type * as React from "react";
import Link from "next/link";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

import Logo from "@/public/logo.svg";

const footerVariants = cva("flex items-center justify-center w-full p-8", {
	variants: {
		variant: {
			landing: "bg-transparent text-foreground",
			dashboard: "bg-transparent text-foreground",
		},
	},
	defaultVariants: {
		variant: "dashboard",
	},
});

function Footer({
	className,
	variant,
	...props
}: React.ComponentProps<"footer"> & VariantProps<typeof footerVariants>) {
	return (
		<footer className={cn(footerVariants({ variant, className }))} {...props}>
			<div className="container flex flex-col items-center justify-between gap-4 px-4 md:flex-row">
				{/* Brand */}
				<div className="flex items-center gap-3">
					<span className="text-sm font-medium">Feito com tecnologia</span>
					<Logo />
				</div>
				{/* Links */}
				<nav className="flex gap-6">
					<Link href="#" className="text-xs text-gray-600 hover:text-gray-900">
						Ajuda
					</Link>
					<Link href="#" className="text-xs text-gray-600 hover:text-gray-900">
						Política de Privacidade
					</Link>
					<Link href="#" className="text-xs text-gray-600 hover:text-gray-900">
						Termos de Uso
					</Link>
				</nav>
				<div className="text-xs text-gray-500">
					Copyright 2025 verifIC. Todos os direitos reservados
				</div>
			</div>
		</footer>
	);
}

export { Footer, footerVariants };
