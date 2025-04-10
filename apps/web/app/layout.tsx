import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
	variable: "--font-hanken-grotesk",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "verifIC",
	description: "Seu próximo gerenciador de eventos",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="pt-BR">
			<body
				className={`${hankenGrotesk.variable} antialiased flex flex-col min-h-screen`}
			>
				{children}
			</body>
		</html>
	);
}
