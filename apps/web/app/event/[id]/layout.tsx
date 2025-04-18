import Image from "next/image";
import { REM } from "next/font/google";
import { notFound } from "next/navigation";

import { Header } from "@/components/landing/header";
import { Footer } from "@/components/footer";
import { getEventById } from "@/lib/data";
import { MainNavProps } from "@/components/main-nav";

const rem = REM({
	variable: "--font-rem",
	subsets: ["latin"],
});

const EVENT_LINKS = [
	{
		href: "",
		label: "Sobre",
		className:
			"hover:text-primary-foreground/90 text-primary-foreground text-sm hover:bg-transparent",
		activeClassName: "!bg-primary-foreground !text-primary",
	},
	{
		href: "/schedule",
		label: "Programação",
		className:
			"hover:text-primary-foreground/90 text-primary-foreground text-sm hover:bg-transparent",
		activeClassName: "!bg-primary-foreground !text-primary",
	},
	{
		href: "/subscribe",
		label: "Inscrições",
		className:
			"hover:text-primary-foreground hover:bg-secondary border-secondary font-semibold uppercase border text-primary-foreground text-xs",
	},
] as MainNavProps["links"];

export default async function EventLayout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: { id: string };
}>) {
	const id = await params.id;
	const event = await getEventById(id);

	if (!event) {
		notFound();
	}

	return (
		<div
			className={`${rem.variable} flex w-full flex-1 flex-col`}
			style={
				{
					"--primary": event.primaryColor,
					"--secondary": event.secondaryColor,
				} as React.CSSProperties
			}
		>
			<Header
				className="!bg-primary border-none py-0"
				buttonClassName="bg-primary text-white text-primary-foreground !hover:bg-white"
				languageSelectorClassName={
					"border-none bg-transparent shadow-none text-primary-foreground"
				}
				links={EVENT_LINKS}
				prefix={`/event/${id}`}
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
			<div className="px-landing flex w-full items-center justify-center py-6">
				<div className="bg-primary container w-full rounded-xl md:rounded-full">
					<Footer
						className="border-none px-4 py-4 !text-white md:px-12"
						showWatermark
					/>
				</div>
			</div>
		</div>
	);
}
