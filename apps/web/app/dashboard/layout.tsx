import { REM } from "next/font/google";

import { Header } from "@/components/dashboard/header";
import { Footer } from "@/components/footer";

const rem = REM({
	variable: "--font-rem",
	subsets: ["latin"],
});

const DASHBOARD_LINKS = [
	{ href: "/dashboard", label: "Visão Geral" },
	{ href: "/dashboard/activities", label: "Atividades" },
	{ href: "/dashboard/participants", label: "Participantes" },
	{ href: "/dashboard/settings", label: "Configurações" },
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
		<div className={`${rem.variable} flex w-full flex-1 flex-col`}>
			<Header links={DASHBOARD_LINKS} />
			{children}
			<Footer />
		</div>
	);
}
