"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface MainNavProps {
	prefix: string; // Prefixo para as rotas
	buttonClassName?: string; // Classe CSS para o botão
	links: {
		href: string;
		label: string;
	}[];
}

export default function MainNav({
	className,
	buttonClassName,
	prefix,
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
		<div
			ref={scrollContainerRef}
			className={cn(
				"scrollbar-none relative w-full overflow-x-auto scroll-smooth",
				className,
			)}
			{...props}
		>
			<nav className="flex min-w-fit items-center justify-start gap-4 px-4">
				{links.map((link) => {
					const href = prefix + link.href;
					const isActive = isLinkActive(href);

					return (
						<Button
							key={href}
							variant={isActive ? "secondary" : "ghost"}
							asChild
						>
							<Link
								className={cn(
									"font-medium whitespace-nowrap",
									buttonClassName,
								)}
								href={href}
								ref={isActive ? activeButtonRef : null}
							>
								{link.label}
							</Link>
						</Button>
					);
				})}
			</nav>
		</div>
	);
}
