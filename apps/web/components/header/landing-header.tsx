"use client";

import React, { useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { Menu, X } from "lucide-react";
import Logo from "@/public/logo.svg";

// Components
import { Button } from "@/components/ui/button";
import { MobileMenu } from "../landing/mobile-menu";
import type { MainNavProps } from "@/components/header/main-nav";
import MainNav from "@/components/header/main-nav";

interface Props {
	prefix?: string;
	links: MainNavProps["links"];
	userActions?: React.ReactNode;
	logo?: React.ReactNode;
	className?: string;
	/** Fundo do cabeçalho (ex.: `var(--ev-header-bg)`). */
	style?: React.CSSProperties;
	/**
	 * Classes do botão de menu mobile. Na página do evento recebe
	 * `text-(--ev-nav-fg) hover:bg-(--ev-nav-hover-bg)`, que lê
	 * sobre qualquer estilo/cor de cabeçalho.
	 */
	buttonClassName?: string;
	/** `class` extra do painel do menu mobile. */
	mobileMenuClassName?: string;
	/** Menu mobile usa os tokens `--ev-mobile-menu-*` do evento. */
	eventMenu?: boolean;
}

export function Header({
	className,
	style,
	prefix,
	links,
	userActions,
	logo,
	buttonClassName,
	mobileMenuClassName,
	eventMenu = false,
}: Props) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	return (
		<header
			style={style}
			className={cn(
				"border-border/40 bg-background/95 supports-backdrop-filter:bg-background/60 px-landing sticky top-0 z-50 flex w-full justify-center border-b backdrop-blur",
				className,
			)}
		>
			<div className="container-p flex w-full items-center justify-between py-8 md:py-6">
				{logo ?? (
					<Link href="/">
						<Logo className="h-6" />
					</Link>
				)}

				<nav className="hidden items-center gap-9 md:flex">
					<MainNav prefix={prefix} links={links} />
					{userActions}
				</nav>

				<Button
					variant="ghost"
					size="icon"
					className={cn(
						"text-primary bg-primary/10 relative rounded-md md:hidden",
						buttonClassName,
					)}
					onClick={() => setIsMenuOpen(!isMenuOpen)}
				>
					<X
						className={cn(
							"absolute top-1/2 left-1/2 h-8 w-8 -translate-1/2 transition-all",
							{
								"scale-100": isMenuOpen,
								"scale-0": !isMenuOpen,
							},
						)}
					/>
					<Menu
						className={cn(
							"absolute top-1/2 left-1/2 h-8 w-8 -translate-1/2 transition-all",
							{
								"scale-100": !isMenuOpen,
								"scale-0": isMenuOpen,
							},
						)}
					/>
					<span className="sr-only">
						{isMenuOpen ? "Close menu" : "Toggle menu"}
					</span>
				</Button>
			</div>

			{/* `style` NÃO é repassado aqui: ele carrega o fundo do cabeçalho
			    (pode ser `transparent`) e sobrescreveria o fundo do painel. */}
			<MobileMenu
				className={mobileMenuClassName}
				eventTheme={eventMenu}
				prefix={prefix}
				links={links}
				isOpen={isMenuOpen}
				onClose={() => setIsMenuOpen(false)}
			/>
		</header>
	);
}
