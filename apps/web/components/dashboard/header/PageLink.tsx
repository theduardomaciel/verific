"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const DASHBOARD_LINKS = [
	{ href: "", label: "Visão Geral" },
	{ href: "/activities", label: "Atividades" },
	{ href: "/participants", label: "Participantes" },
	{ href: "/settings", label: "Configurações" },
];

export default function MainNav({
	className,
	...props
}: React.HTMLAttributes<HTMLElement>) {
	const pathname = usePathname();
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const activeButtonRef = useRef<HTMLAnchorElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname is a dependency
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

	return (
		<div
			ref={scrollContainerRef}
			className={cn(
				"relative w-full overflow-x-auto scroll-smooth scrollbar-none",
				className,
			)}
			{...props}
		>
			<nav className="flex items-center justify-start gap-4 px-4 min-w-fit">
				{DASHBOARD_LINKS.map((link) => {
					const href = `/dashboard${link.href}`;
					const isActive = pathname === href;

					return (
						<Button
							key={href}
							variant={isActive ? "secondary" : "ghost"}
							asChild
						>
							<Link
								className="font-medium whitespace-nowrap"
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
