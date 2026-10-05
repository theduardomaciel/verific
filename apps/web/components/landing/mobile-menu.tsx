"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { MainNavLink } from "../header/main-nav";

interface MobileMenuProps {
	prefix?: string;
	className?: string;
	links: MainNavLink[];
	isOpen: boolean;
	onClose: () => void;
	/**
	 * Usa os tokens do evento (`--ev-mobile-menu-bg`/`--ev-mobile-menu-fg`)
	 * em vez do fundo da página. Antes o `Header` repassava o próprio
	 * `style` (fundo do cabeçalho, que pode ser `transparent`) e o painel
	 * fullscreen ficava vazado sobre a página.
	 */
	eventTheme?: boolean;
}

/**
 * Menu fullscreen do mobile. O item ativo recebe `aria-current="page"`, que
 * o tema do evento pode estilizar por atributo (assim como no `MainNav`).
 */
export function MobileMenu({
	prefix,
	className,
	links,
	isOpen,
	onClose,
	eventTheme = false,
}: MobileMenuProps) {
	const pathname = usePathname();

	const isLinkActive = (href: string): boolean => {
		if (href === prefix) {
			return pathname === prefix || pathname === `${prefix}/`;
		}
		return pathname.startsWith(`${href}/`) || pathname === href;
	};

	return (
		<div
			className={cn(
				eventTheme
					? "bg-[var(--ev-mobile-menu-bg)] text-[var(--ev-mobile-menu-fg)]"
					: "bg-background",
				"pointer-events-none absolute inset-x-0 top-full h-screen -translate-x-full transform opacity-0 transition-all duration-300 ease-in-out select-none",
				className,
				{
					"pointer-events-auto translate-x-0 opacity-100": isOpen,
				},
			)}
		>
			<nav className="flex h-full flex-col items-start justify-center space-y-12 px-8 pb-32">
				{links.map((link) => {
					const href = prefix + link.href;
					const isActive = isLinkActive(href);

					return (
						<Link
							key={`${href}-${link.label}`}
							href={href}
							className={cn(
								"text-xl font-medium transition-opacity hover:opacity-80",
								link.className,
								link.mobileClassName,
							)}
							onClick={onClose}
							aria-current={isActive ? "page" : undefined}
						>
							{link.label}
						</Link>
					);
				})}
			</nav>
		</div>
	);
}
