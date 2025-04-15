import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";

import { Hanken_Grotesk } from "next/font/google";
const hankenGrotesk = Hanken_Grotesk({
	variable: "--font-hanken-grotesk",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "verifIC",
	description: "Seu próximo gerenciador de eventos",
	icons: {
		icon: "/favicon/favicon.svg",
		apple: [{ url: "/favicon/apple-icon.png" }],
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="pt-BR" suppressHydrationWarning>
			{/* <head>
				<script src="https://unpkg.com/react-scan/dist/auto.global.js" />
			</head> */}
			<body className={`${hankenGrotesk.variable} antialiased`}>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					{children}
				</ThemeProvider>
			</body>
		</html>
	);
}
