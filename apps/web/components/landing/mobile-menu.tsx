"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

// Components
import { MainNavProps } from "../header/main-nav";

interface MobileMenuProps {
	prefix?: string;
	className?: string;
	links: MainNavProps["links"];
	isOpen: boolean;
	onClose: () => void;
}

export function MobileMenu({
	prefix,
	className,
	links,
	isOpen,
	onClose,
}: MobileMenuProps) {
	return (
		<div
			className={cn(
				"bg-background pointer-events-none absolute inset-x-0 top-full h-screen -translate-x-full transform opacity-0 transition-all duration-300 ease-in-out select-none",
				className,
				{
					"pointer-events-auto translate-x-0 opacity-100": isOpen,
				},
			)}
		>
			<nav className="flex h-full flex-col items-start justify-center space-y-12 px-8 pb-32">
				{links.map((link) => (
					<Link
						key={`${link.href}-${link.label}`}
						href={`${prefix}${link.href}`}
						className={cn(
							"hover:text-primary text-xl font-medium",
							link.mobileClassName,
						)}
						onClick={onClose}
					>
						{link.label}
					</Link>
				))}
			</nav>
		</div>
	);
}
