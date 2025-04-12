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

export default function DashboardLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className={`${rem.variable} w-full flex flex-col flex-1`}>
			<Header links={DASHBOARD_LINKS} />
			{children}
			<Footer />
		</div>
	);
}
