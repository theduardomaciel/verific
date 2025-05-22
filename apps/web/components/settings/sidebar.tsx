"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

interface Props {
	prefix: string;
	links: {
		href: string;
		label: string;
		disabled?: boolean;
	}[];
}

export function SettingsSidebar({ prefix, links }: Props) {
	const pathname = usePathname();

	return (
		<div className="w-full shrink-0 md:h-screen md:w-64">
			<nav className="flex flex-col space-y-1 md:sticky md:top-16">
				{links.map((link) => {
					const url = `${prefix}${link.href}`;
					const isActive = pathname === url;

					return (
						<Link
							key={url}
							href={link.disabled ? "#" : url}
							className={cn(
								"text-muted-foreground border-l-2 border-transparent px-4 py-2 text-left font-medium transition-colors",
								{
									"text-primary border-primary": isActive,
									"text-muted-foreground cursor-not-allowed opacity-50":
										link.disabled,
									"hover:text-primary":
										!isActive && !link.disabled,
								},
							)}
						>
							{link.label}
						</Link>
					);
				})}
			</nav>
		</div>
	);
}
