import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// Icons
import Logo from "@/public/logo.svg";

// Fonts
import { REM } from "next/font/google";
const rem = REM({
	variable: "--font-rem",
	subsets: ["latin"],
});

// Components
import { Header } from "@/components/header/landing-header";
import { Footer } from "@/components/footer";
import { MainNavProps } from "@/components/header/main-nav";

// Lib
import { isAfterEnd } from "@/lib/date";
import { getProject } from "@/lib/data";
import { env } from "@verific/env";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}): Promise<Metadata> {
	const { eventUrl } = await params;
	const { project } = await getProject(eventUrl);

	const baseUrl = env.NEXT_PUBLIC_VERCEL_URL;
	const imageUrl =
		project.coverUrl ||
		project.largeLogoUrl ||
		project.logoUrl ||
		project.thumbnailUrl;
	const fullImageUrl = imageUrl ? `${baseUrl}${imageUrl}` : undefined;

	return {
		title: project.name,
		description: project.description || undefined,
		robots: {
			index: true,
			follow: true,
			googleBot: {
				index: true,
				follow: true,
				"max-video-preview": -1,
				"max-image-preview": "large",
				"max-snippet": -1,
			},
		},
		icons: project.logoUrl ? { icon: project.logoUrl } : undefined,
		openGraph: {
			title: project.name,
			description: project.description || undefined,
			url: `${baseUrl}/${eventUrl}`,
			siteName: "verifIC",
			images: fullImageUrl
				? [{ url: fullImageUrl, alt: `${project.name} image` }]
				: [],
			locale: "pt_BR",
			type: "website",
		},
		twitter: {
			card: "summary_large_image",
			title: project.name,
			description: project.description || undefined,
			images: fullImageUrl ? [fullImageUrl] : [],
		},
	};
}

export default async function EventLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ eventUrl: string }>;
}) {
	const { eventUrl } = await params;

	const { project, isParticipant } = await getProject(eventUrl);

	if (!project) {
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
			: project.isRegistrationEnabled &&
				!project.isArchived &&
				!isAfterEnd(project.endDate) && {
					href: "/subscribe",
					label: "Inscrições",
					className:
						"hover:text-primary-foreground hover:bg-secondary dark:hover:bg-secondary border-secondary font-semibold uppercase border text-primary-foreground text-xs",
					activeClassName: "!text-primary-foreground !bg-secondary",
					mobileClassName:
						"text-primary-foreground uppercase py-3 border border-secondary w-full rounded text-center items-center text-sm bg-secondary",
				},
	].filter(Boolean) as MainNavProps["links"];

	return (
		<div
			className={`${rem.variable} flex w-full flex-1 flex-col`}
			style={
				{
					"--primary": project.primaryColor,
					"--secondary": project.secondaryColor,
					"--ring": project.primaryColor,
					"--muted": project.secondaryColor,
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
						{project.largeLogoUrl || project.logoUrl ? (
							<Image
								src={project.largeLogoUrl || project.logoUrl!}
								width={150}
								height={28}
								alt="Event logo"
							/>
						) : (
							<Logo className="h-8" />
						)}
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
