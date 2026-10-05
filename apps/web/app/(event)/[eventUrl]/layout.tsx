import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";

import Logo from "@/public/logo.svg";
import { EventHeader } from "@/components/event-header";
import { Footer } from "@/components/footer";
import { EventBackgroundEffects } from "@/components/landing/event-container";
import { getEventStaticParams, getProject } from "@/lib/data";
import { FONT_PRESETS } from "@/lib/theme/fonts";
import { resolveEventTheme } from "@/lib/theme/resolve";
import type { FontPreset } from "@verific/drizzle/theme";
import { env } from "@verific/env";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}): Promise<Metadata> {
	"use cache";
	cacheLife("hours");

	const { eventUrl } = await params;
	cacheTag("projects", `project:${eventUrl}`);
	const result = await getProject(eventUrl);

	if (!result?.project) {
		return { title: "Evento" };
	}

	const { project } = result;
	const baseUrl = env.NEXT_PUBLIC_VERCEL_URL.replace(/\/$/, "");
	const imageUrl =
		project.thumbnailUrl ||
		project.coverUrl ||
		project.largeLogoUrl ||
		project.logoUrl;
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
	const { cssVars, theme } = resolveEventTheme({
		theme: (project as { theme?: unknown }).theme,
		primaryColor: project.primaryColor,
		secondaryColor: project.secondaryColor,
	});
	const fontVariables = [
		FONT_PRESETS[theme.fonts.heading as FontPreset]?.variable,
		FONT_PRESETS[theme.fonts.body as FontPreset]?.variable,
		// TODO(Fase 3): remover; `font-dashboard` ainda é usado em páginas
		// de evento e migra para `font-heading`.
		FONT_PRESETS.rem.variable,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div
			className={`dark ${fontVariables} relative flex w-full flex-1 flex-col`}
			style={
				{
					...cssVars,
					"--font-sans": "var(--ev-font-body)",
				} as React.CSSProperties
			}
		>
			<EventBackgroundEffects />
			<EventHeader
				eventUrl={eventUrl}
				className="relative h-21 border-none py-0"
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
			<div className="container-p relative z-10 flex w-full items-center justify-center py-6">
				<div
					className="w-full rounded-xl md:rounded-full"
					style={{ background: "var(--ev-footer-bg)" }}
				>
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
