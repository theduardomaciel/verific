"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

/** Links podem forjar o próprio `Button` quando o header tem estilo próprio. */
export interface MainNavLink {
	href: string;
	label: string;
	className?: string; // Classe CSS adicional para o link
	/** Sobrescreve o variant padrão (`secondary`/`ghost`) do `Button`. */
	variant?: React.ComponentProps<typeof Button>["variant"];
	/** Classe adicional só no menu mobile (`MobileMenu`). */
	mobileClassName?: string;
}

export interface MainNavProps {
	prefix?: string; // Prefixo para as rotas
	links: MainNavLink[];
}

export default function MainNav({
	className,
	prefix = "",
	links,
	...props
}: React.HTMLAttributes<HTMLElement> & MainNavProps) {
	const pathname = usePathname();
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const activeButtonRef = useRef<HTMLAnchorElement>(null);

	useEffect(() => {
		if (scrollContainerRef.current && activeButtonRef.current) {
			const container = scrollContainerRef.current;
			const activeButton = activeButtonRef.current;

			// Calcula a posição para centralizar o botão ativo
			const scrollTo =
				activeButton.offsetLeft -
				(container.clientWidth - activeButton.clientWidth) / 2;

			container.scrollTo({
				left: scrollTo,
				behavior: "smooth",
			});
		}
	}, [pathname]);

	const isLinkActive = (href: string): boolean => {
		// Caso especial para dashboard principal
		if (href === prefix) {
			return pathname === prefix || pathname === `${prefix}/`;
		}

		// Para as demais rotas, verifica se o pathname começa com o href
		return pathname.startsWith(href + "/") || pathname === href;
	};

	return (
		// Wrapper fixo: não rola, então os gradientes ficam parados.
		// min-w-0 + flex-1 deixam ele ocupar só o espaço restante no desktop.
		<div
			className={cn(
				"relative w-full min-w-0 md:w-auto md:flex-1",
				className,
			)}
			{...props}
		>
			{/* Container rolável: apenas o conteúdo rola aqui dentro */}
			<div
				ref={scrollContainerRef}
				className="px-container-h relative w-full scrollbar-none overflow-x-auto scroll-smooth"
			>
				<nav className="flex min-w-fit items-center justify-start gap-4">
					{links.map((link) => {
						const href = prefix + link.href;
						const isActive = isLinkActive(href);

						return (
							<Button
								key={href}
								variant={
									link.variant ??
									(isActive ? "secondary" : "ghost")
								}
								asChild
							>
								<Link
									className={cn(
										"font-medium whitespace-nowrap",
										link.className,
									)}
									href={href}
									ref={isActive ? activeButtonRef : null}
									aria-current={isActive ? "page" : undefined}
								>
									{link.label}
								</Link>
							</Button>
						);
					})}
				</nav>
			</div>

			{/* Gradientes sobrepostos ao wrapper, fora da área de scroll */}
			<div className="from-background pointer-events-none absolute top-0 left-0 h-full w-8 bg-linear-to-r to-transparent" />
			<div className="from-background pointer-events-none absolute top-0 right-0 h-full w-8 bg-linear-to-l to-transparent" />
		</div>
	);
}
