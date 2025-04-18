"use client";

import React, { useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { Menu, X } from "lucide-react";
import Logo from "@/public/logo.svg";

// Components
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
			<div className="container flex w-full items-center justify-between py-8 md:py-4">
				<Link href="#">{logo ?? <Logo className="h-6" />}</Link>

				<nav className="hidden items-center gap-9 md:flex">
					<MainNav prefix={prefix} links={links} />

					<div className="flex items-center gap-4">
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
					</div>
				</nav>

				{isMenuOpen ? (
					<Button
						variant="ghost"
						size="icon"
						className={buttonClassName}
						onClick={() => setIsMenuOpen(false)}
					>
						<X className="h-6 w-6" />
						<span className="sr-only">Close menu</span>
					</Button>
				) : (
					<Button
						variant="ghost"
						size="icon"
						className={cn(
							"text-primary bg-primary/10 rounded-md md:hidden",
							buttonClassName,
						)}
						onClick={() => setIsMenuOpen(true)}
					>
						<Menu className="h-6 w-6" />
						<span className="sr-only">Toggle menu</span>
					</Button>
				)}
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
