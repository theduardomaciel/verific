"use client";

import React, { useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { Menu, X } from "lucide-react";
import Logo from "@/public/logo.svg";

// Components
import { Button } from "@/components/ui/button";
import { MobileMenu } from "./mobile-menu";
import MainNav, { MainNavProps } from "@/components/main-nav";

interface Props {
	prefix?: string;
	links: MainNavProps["links"];
	logo?: React.ReactNode;
	className?: string;
	buttonClassName?: string;
	languageSelectorClassName?: string;
	mobileMenuClassName?: string;
}

export function Header({
	className,
	prefix,
	links,
	logo,
	buttonClassName,
	languageSelectorClassName,
	mobileMenuClassName,
}: Props) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	return (
		<header
			className={cn(
				"border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60 px-landing sticky top-0 z-50 flex w-full justify-center border-b backdrop-blur",
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

					{/* <div className="flex items-center gap-4">
						<Select
							defaultValue="pt"
							onValueChange={(value) => console.log(value)}
						>
							<SelectTrigger
								className={languageSelectorClassName}
							>
								<SelectValue placeholder="Selecione o idioma" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem
									value="pt"
									className="cursor-pointer"
								>
									🇧🇷 PT
								</SelectItem>
								<SelectItem
									value="en"
									className="cursor-pointer"
								>
									🇺🇸 EN
								</SelectItem>
							</SelectContent>
						</Select>
					</div> */}
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

			<MobileMenu
				className={mobileMenuClassName}
				prefix={prefix}
				links={links}
				isOpen={isMenuOpen}
				onClose={() => setIsMenuOpen(false)}
			/>
		</header>
	);
}
