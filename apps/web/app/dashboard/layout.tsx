import { REM } from "next/font/google";

import { DashboardHeader } from "@/components/dashboard/header";
import { Footer } from "@/components/footer";

const rem = REM({
	variable: "--font-rem",
	subsets: ["latin"],
});

const DASHBOARD_LINKS = [
	{ href: "", label: "Visão Geral" },
	{ href: "/activities", label: "Atividades" },
	{ href: "/participants", label: "Participantes" },
	{ href: "/settings", label: "Configurações" },
];

import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Dashboard",
};

export default function DashboardLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div
			className={`${rem.variable} flex w-full flex-1 flex-col items-center`}
		>
			<DashboardHeader prefix={"/dashboard"} links={DASHBOARD_LINKS} />
			{children}
			<Footer />
		</div>
	);
}
