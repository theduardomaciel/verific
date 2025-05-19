import { REM } from "next/font/google";

import { DashboardHeader } from "@/components/dashboard/header";
import { Footer } from "@/components/footer";

const rem = REM({
	variable: "--font-rem",
	subsets: ["latin"],
});

const ACCOUNT_LINKS = [
	{ href: "", label: "Projetos" },
	{ href: "/settings", label: "Configurações" },
];

export default function AccountLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className={`${rem.variable} flex w-full flex-1 flex-col`}>
			<DashboardHeader
				prefix="/account"
				links={ACCOUNT_LINKS}
				showProjectSwitcher={false}
				showAccountActions={false}
			/>
			{children}
			<Footer />
		</div>
	);
}
