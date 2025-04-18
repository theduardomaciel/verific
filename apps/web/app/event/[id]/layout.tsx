import { REM } from "next/font/google";

import { Header } from "@/components/header/landing";
import { Footer } from "@/components/footer";
import Image from "next/image";

const rem = REM({
	variable: "--font-rem",
	subsets: ["latin"],
});

const EVENT_LINKS = [
	{ href: "", label: "Sobre" },
	{ href: "/schedule", label: "Programação" },
	{ href: "/subscribe", label: "Inscrições" },
];

export default function EventLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className={`${rem.variable} flex w-full flex-1 flex-col`}>
			<Header
				className="!bg-primary border-none py-0"
				buttonClassName="bg-primary text-white !hover:bg-red-500"
				links={EVENT_LINKS}
				logo={
					<Image
						src={"/images/secomp.png"}
						width={150}
						height={28}
						alt="Event logo"
					/>
				}
			/>
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
