"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

interface Props {
	links: {
		href: string;
		label: string;
	}[];
}

export function SettingsSidebar({ links }: Props) {
	const pathname = usePathname();

	return (
		<div className="w-full md:w-64 shrink-0 md:h-screen">
			<nav className="flex flex-col space-y-1 md:sticky md:top-16">
				{links.map((link) => {
					const isActive = pathname === link.href;

					return (
						<Link
							key={link.href}
							href={link.href}
							className={cn(
								"py-2 px-4 text-left font-medium border-l-2 text-[#6b7280] hover:text-primary border-transparent",
								{
									"text-primary border-primary": isActive,
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
