"use client";

import { useState } from "react";
import Link from "next/link";

import { Menu, X } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { MobileMenu } from "./mobile-menu";
import { Brand } from "./brand";

export function Header() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	return (
		<header className="border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60 px-landing sticky top-0 z-50 flex w-full justify-center border-b backdrop-blur">
			<div className="container flex w-full items-center justify-between py-8 md:py-4">
				<Brand />

				<nav className="hidden items-center gap-9 md:flex">
					<Link
						href="#"
						className="hover:text-primary text-sm font-medium"
					>
						Sobre o projeto
					</Link>
					<Link
						href="#"
						className="hover:text-primary text-sm font-medium"
					>
						Funcionalidades
					</Link>
					<Link
						href="#"
						className="hover:text-primary text-sm font-medium"
					>
						FAQ
					</Link>
					<div className="flex items-center gap-4">
						<Select
							defaultValue="pt"
							onValueChange={(value) => console.log(value)}
						>
							<SelectTrigger>
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
						<ThemeSwitcher />
					</div>
				</nav>

				{isMenuOpen ? (
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsMenuOpen(false)}
					>
						<X className="h-6 w-6" />
						<span className="sr-only">Close menu</span>
					</Button>
				) : (
					<Button
						variant="ghost"
						size="icon"
						className="text-primary bg-primary/10 rounded-md md:hidden"
						onClick={() => setIsMenuOpen(true)}
					>
						<Menu className="h-6 w-6" />
						<span className="sr-only">Toggle menu</span>
					</Button>
				)}
			</div>

			<MobileMenu isOpen={isMenuOpen} />
		</header>
	);
}
