import type { Metadata, Viewport } from "next";

import "./globals.css";

// Fonts
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

// viewport-fit=cover estende a página sob a home indicator no iOS,
// expondo env(safe-area-inset-*) para respeitar as bordas do aparelho.
export const viewport: Viewport = {
	viewportFit: "cover",
};

// Components
import { Providers } from "@/components/providers";

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="pt-BR"
			data-scroll-behavior="smooth"
			suppressHydrationWarning
		>
			{/* <head>
				<script src="https://unpkg.com/react-scan/dist/auto.global.js" />
			</head> */}
			<body className={`${hankenGrotesk.variable} antialiased`}>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
