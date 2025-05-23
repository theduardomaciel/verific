import Image from "next/image";
import Link from "next/link";

import { notFound } from "next/navigation";

// Components
import { Header } from "@/components/header/landing-header";
import { Footer } from "@/components/footer";
import { MainNavProps } from "@/components/header/main-nav";

// API
import { serverClient } from "@/lib/trpc/server";

import { REM } from "next/font/google";
import { auth } from "@verific/auth";
const rem = REM({
	variable: "--font-rem",
	subsets: ["latin"],
});

export default async function EventLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ eventUrl: string }>;
}) {
	const { eventUrl } = await params;

	let event;
	let isParticipant = false;

	try {
		const data = await serverClient.getProject({
			url: eventUrl,
		});

		if (!data) {
			console.error("Event not found", { eventUrl });
			notFound();
		}

		event = data.project;
		isParticipant = data.isParticipant;
	} catch (error) {
		console.error("Event not found", { eventUrl });
		notFound();
	}

	const EVENT_LINKS = [
		{
			href: "",
			label: "Sobre",
			className:
				"hover:text-primary-foreground/90 text-primary-foreground text-sm hover:bg-transparent",
			activeClassName: "!bg-primary-foreground !text-primary",
			mobileClassName: "text-primary-foreground",
		},
		{
			href: "/schedule",
			label: "Programação",
			className:
				"hover:text-primary-foreground/90 text-primary-foreground text-sm hover:bg-transparent",
			activeClassName: "!bg-primary-foreground !text-primary",
			mobileClassName: "text-primary-foreground",
		},
		isParticipant
			? {
					href: "/my",
					label: "Sua Conta",
					className:
						"hover:text-primary-foreground hover:bg-secondary dark:hover:bg-secondary border-secondary font-semibold uppercase border text-primary-foreground text-xs",
					activeClassName: "!text-primary-foreground !bg-secondary",
					mobileClassName:
						"text-primary-foreground uppercase py-3 border border-secondary w-full rounded text-center items-center text-sm bg-secondary",
				}
			: {
					href: "/subscribe",
					label: "Inscrições",
					className:
						"hover:text-primary-foreground hover:bg-secondary dark:hover:bg-secondary border-secondary font-semibold uppercase border text-primary-foreground text-xs",
					activeClassName: "!text-primary-foreground !bg-secondary",
					mobileClassName:
						"text-primary-foreground uppercase py-3 border border-secondary w-full rounded text-center items-center text-sm bg-secondary",
				},
	] as MainNavProps["links"];

	return (
		<div
			className={`${rem.variable} flex w-full flex-1 flex-col`}
			style={
				{
					"--primary": event.primaryColor,
					"--secondary": event.secondaryColor,
					"--ring": event.primaryColor,
					"--muted": event.secondaryColor,
					"--accent":
						"color-mix(in oklab, var(--foreground) 2%, transparent)",
					"--accent-foreground": "var(--foreground)",
				} as React.CSSProperties
			}
		>
			<Header
				className="!bg-primary relative border-none py-0"
				mobileMenuClassName={"bg-primary"}
				buttonClassName="bg-primary text-white text-primary-foreground !hover:text-white"
				languageSelectorClassName={
					"border-none bg-transparent shadow-none text-primary-foreground"
				}
				links={EVENT_LINKS}
				prefix={`/${eventUrl}`}
				logo={
					<Link href={`/${eventUrl}`}>
						<Image
							src={"/images/secomp.png"}
							width={150}
							height={28}
							alt="Event logo"
						/>
					</Link>
				}
			/>
			{children}
			<div className="container-p flex w-full items-center justify-center py-6">
				<div className="bg-primary w-full rounded-xl md:rounded-full">
					<Footer
						className="border-none px-4 py-4 !text-white md:px-12"
						showWatermark
					/>
				</div>
			</div>
		</div>
	);
}
