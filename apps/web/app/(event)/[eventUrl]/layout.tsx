import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";

import Logo from "@/public/logo.svg";
import { EventHeader } from "@/components/event-header";
import { EventThemeSync } from "@/components/event-theme-sync";
import { Footer } from "@/components/footer";
import { EventBackgroundEffects } from "@/components/landing/event-container";
import { Skeleton } from "@/components/ui/skeleton";
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

/**
 * Fallback visível do layout: o HTML estático pinta este esqueleto
 * (header + conteúdo) antes do JS — em vez da tela em branco anterior —
 * e some quando a árvore do header (que lê `usePathname()`) completa a
 * fronteira. Vale para a carga inicial e para navegações do cliente.
 */
function EventLayoutFallback() {
	return (
		<div className="bg-background min-h-screen">
			<header className="container-p flex items-center justify-between py-4">
				<Skeleton className="h-9 w-36" />
				<div className="flex items-center gap-3">
					<Skeleton className="h-9 w-24 rounded-full" />
					<Skeleton className="h-9 w-24 rounded-full" />
					<Skeleton className="h-9 w-9 rounded-full" />
				</div>
			</header>
			<main className="container-p flex flex-col gap-8 py-10">
				<Skeleton className="h-56 w-full rounded-xl" />
				<div className="flex flex-col gap-4">
					<Skeleton className="h-8 w-72" />
					<Skeleton className="h-5 w-full max-w-2xl" />
					<Skeleton className="h-5 w-2/3 max-w-xl" />
				</div>
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 3 }).map((_, index) => (
						<div
							key={index}
							className="border-border flex flex-col gap-3 rounded-md border p-6"
						>
							<Skeleton className="h-6 w-3/4" />
							<Skeleton className="h-4 w-1/2" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-5/6" />
						</div>
					))}
				</div>
			</main>
		</div>
	);
}

interface EventLogoProps {
	light: string | null;
	dark: string | null;
	href: string;
}

/**
 * Logo do evento no cabeçalho.
 *
 * A variante escura só recebe `dark:hidden`/`hidden dark:block` quando
 * existe de fato: antes, a clara sumia no modo escuro e a escura não era
 * renderizada sem URL própria — o logo desaparecia por completo.
 */
function EventLogo({ light, dark, href }: EventLogoProps) {
	if (!light) {
		return (
			<Link href={href} className="text-(--ev-header-fg)">
				<Logo className="h-9" />
			</Link>
		);
	}

	return (
		<Link href={href} className="text-(--ev-header-fg)">
			<Image
				src={light}
				width={150}
				height={28}
				alt="Event logo"
				className={dark ? "h-8 w-auto dark:hidden" : "h-8 w-auto"}
				loading="eager"
			/>
			{dark && (
				<Image
					src={dark}
					width={150}
					height={28}
					alt="Event logo"
					className="hidden h-8 w-auto dark:block"
					loading="eager"
				/>
			)}
		</Link>
	);
}

/**
 * Checks (`getProject` + `notFound`) run before the `<Suspense>`
 * boundary below is even created — so an unknown `eventUrl` produces a
 * real 404 instead of a streamed soft-404. The boundary itself stays:
 * the header tree (`EventHeader` → `MainNav`) reads `usePathname()`,
 * which is runtime-only and must stream inside a boundary.
 */
export default async function EventLayout({
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
	// Espelha o tema no `:root` para elementos que escapam da `div` temada:
	// `Dialog` (portal em `document.body`), `Toaster` e `NextTopLoader`
	// (ambos fora do escopo, no `Providers`). Sem isso eles usam as cores
	// globais em vez de `--primary`/`--secondary` do evento. O `dark` para
	// esses portais é garantido via `EventThemeSync` (efeito cliente).
	const rootCssText = Object.entries(cssVars)
		.map(([key, value]) => `${key}:${value}`)
		.join(";");

	return (
		<>
			{/* Fora da fronteira: o tema do evento já vale para o esqueleto. */}
			<style>{`:root{${rootCssText}}`}</style>
			<Suspense fallback={<EventLayoutFallback />}>
				<EventThemeSync cssVars={cssVars} />
				<div
					className={`event-public ${fontVariables} relative flex w-full flex-1 flex-col`}
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
							<EventLogo
								href={`/${eventUrl}`}
								light={project.largeLogoUrl || project.logoUrl}
								dark={
									project.largeLogoDarkUrl ||
									project.logoDarkUrl
								}
							/>
						}
					/>
					{children}
					<div className="container-p relative z-10 flex w-full items-center justify-center py-6">
						<div
							className="w-full rounded-xl md:rounded-full"
							style={{ background: "var(--ev-footer-bg)" }}
						>
							<Footer
								className="border-none px-4 py-4 text-(--ev-footer-fg) md:px-12"
								showWatermark
							/>
						</div>
					</div>
				</div>
			</Suspense>
		</>
	);
}
