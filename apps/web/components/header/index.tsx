"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

// Icons
import Logo from "@/public/logo.svg";

// Components
import { MobileMenu } from "@/components/header/mobile";

export const SECTIONS = [
	{
		title: "Sobre",
		href: "/",
	},
	{
		title: "Membros",
		href: "/members",
	},
	{
		title: "Eventos",
		href: "/events",
	},
];

const sectionsHref = SECTIONS.map((section) => section.href);

interface SectionsProps {
	pathname: string;
	hrefIsOneOfSections?: boolean;
}

const Sections = ({ pathname, hrefIsOneOfSections }: SectionsProps) =>
	SECTIONS.map(({ title, href }) => (
		<li
			key={title}
			className={cn("text-base font-medium text-center transition-opacity", {
				"opacity-50": hrefIsOneOfSections && pathname !== href,
			})}
		>
			<Link href={href} className={"relative text-nowrap"}>
				{title}
			</Link>
		</li>
	));

export default function Header() {
	const pathname = usePathname();
	const hrefIsOneOfSections = sectionsHref.includes(pathname);

	return (
		<header className="flex flex-row items-center justify-between absolute top-0 left-0 right-0 w-full px-wrapper py-9 z-50">
			<Link href={"/"}>
				<Logo />
			</Link>
			{/* <ul className="hidden sm:flex flex-row items-center justify-between sm:justify-end gap-12">
				<Sections
					pathname={pathname}
					hrefIsOneOfSections={hrefIsOneOfSections}
				/>
			</ul>
			<MobileMenu>
				<ul className="flex flex-col items-center justify-start gap-12">
					<Sections
						pathname={pathname}
						hrefIsOneOfSections={hrefIsOneOfSections}
					/>
				</ul>
			</MobileMenu> */}
			<Link href={"/dashboard/events"}>Dashboard</Link>
		</header>
	);
}
