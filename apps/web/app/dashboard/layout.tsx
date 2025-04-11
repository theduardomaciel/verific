import { REM } from "next/font/google";

import { Header } from "@/components/dashboard/header";
import { Footer } from "@/components/Footer";

const rem = REM({
	variable: "--font-rem",
	subsets: ["latin"],
});

export default function DashboardLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className={`${rem.variable} w-full flex flex-col flex-1`}>
			<Header />
			{children}
			<Footer />
		</div>
	);
}
