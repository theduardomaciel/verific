import { REM } from "next/font/google";

import { Header } from "@/components/dashboard/header";
import { Footer } from "@/components/footer";

const rem = REM({
	variable: "--font-rem",
	subsets: ["latin"],
});

const ACCOUNT_LINKS = [
	{ href: "", label: "Projetos" },
	{ href: "/settings", label: "Configurações" },
];

export default function EventLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className={`${rem.variable} flex w-full flex-1 flex-col`}>
			{children}
			<div className="px-landing w-full py-6">
				<div className="bg-primary w-full rounded-xl md:rounded-full">
					<Footer
						className="border-none px-4 py-4 md:px-12"
						showWatermark
					/>
				</div>
			</div>
		</div>
	);
}
