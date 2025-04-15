"use client";

import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
	isOpen: boolean;
}

export function MobileMenu({ isOpen }: MobileMenuProps) {
	return (
		<div
			className={cn(
				"bg-background pointer-events-none absolute inset-x-0 top-full h-screen -translate-x-full transform opacity-0 transition-all duration-300 ease-in-out select-none",
				{
					"pointer-events-auto translate-x-0 opacity-100": isOpen,
				},
			)}
		>
			<nav className="flex h-full flex-col items-start justify-center space-y-12 px-8 pb-16">
				<Link href="#" className="text-xl font-medium">
					Sobre o projeto
				</Link>
				<Link href="#" className="text-xl font-medium">
					Funcionalidades
				</Link>
				<Link href="#" className="text-xl font-medium">
					FAQ
				</Link>

				<ThemeSwitcher />
			</nav>
		</div>
	);
}
