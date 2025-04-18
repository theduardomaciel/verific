"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

// Components
import { ThemeSwitcher } from "@/components/theme-switcher";

interface MobileMenuProps {
	links: {
		href: string;
		label: string;
		className?: string;
	}[];
	isOpen: boolean;
}

export function MobileMenu({ links, isOpen }: MobileMenuProps) {
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
				{links.map((link) => (
					<Link
						key={`${link.href}-${link.label}`}
						href={link.href}
						className={cn(
							"hover:text-primary text-2xl font-medium",
							link.className,
						)}
					>
						{link.label}
					</Link>
				))}

				<ThemeSwitcher />
			</nav>
		</div>
	);
}
