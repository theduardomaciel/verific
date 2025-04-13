import { REM } from "next/font/google";

import { Header } from "@/components/dashboard/header";
import { Footer } from "@/components/footer";

const rem = REM({
	variable: "--font-rem",
	subsets: ["latin"],
});

const ACCOUNT_LINKS = [
	{ href: "/account", label: "Projetos" },
	{ href: "/account/settings", label: "Configurações" },
];

export default function AccountLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className={`${rem.variable} w-full flex flex-col flex-1`}>
			<Header
				links={ACCOUNT_LINKS}
				showProjectSwitcher={false}
				showAccountActions={false}
			/>
			{children}
			<Footer />
		</div>
	);
}
