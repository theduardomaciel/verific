import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";

import Logo from "@/public/logo.svg";
import { REM } from "next/font/google";
import { EventHeader } from "@/components/event-header";
import { Footer } from "@/components/footer";
import { getEventStaticParams, getProject } from "@/lib/data";
import { env } from "@verific/env";

const rem = REM({
	variable: "--font-rem",
	subsets: ["latin"],
});

export async function generateMetadata({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}): Promise<Metadata> {
	const { eventUrl } = await params;
	const result = await getProject(eventUrl);

	if (!result?.project) {
		return { title: "Evento" };
	}

	const { project } = result;
	const baseUrl = env.NEXT_PUBLIC_VERCEL_URL.replace(/\/$/, "");
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

export async function generateStaticParams() {
	return getEventStaticParams();
}

function EventLayoutFallback() {
	return <div className="min-h-screen" />;
}

async function EventLayoutContent({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ eventUrl: string }>;
}) {
	const { eventUrl } = await params;
	const result = await getProject(eventUrl);

	if (!result?.project) {
		notFound();
	}

	const { project } = result;

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
			<EventHeader
				eventUrl={eventUrl}
				project={{
					id: project.id,
					name: project.name,
					url: project.url,
					endDate: project.endDate,
					isArchived: Boolean(project.isArchived),
					isRegistrationEnabled: Boolean(
						project.isRegistrationEnabled,
					),
				}}
				className="!bg-primary relative h-21 border-none py-0"
				mobileMenuClassName="bg-primary"
				buttonClassName="bg-primary text-white text-primary-foreground !hover:text-white"
				logo={
					<Link href={`/${eventUrl}`} className="text-white">
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

export default function EventLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ eventUrl: string }>;
}) {
	return (
		<Suspense fallback={<EventLayoutFallback />}>
			<EventLayoutContent params={params}>{children}</EventLayoutContent>
		</Suspense>
	);
}
