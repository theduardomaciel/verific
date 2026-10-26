import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { projectCacheTag, projectUrlCacheTag } from "@verific/api";
import { parseGamificationConfig } from "@verific/drizzle/gamification";
import { presetOfFamily } from "@verific/drizzle/theme";

import { Skeleton } from "@/components/ui/skeleton";

import { EventHeader } from "@/components/event-header";
import { EventThemeSync } from "@/components/event-theme-sync";
import { Footer } from "@/components/footer";
import { EventBackgroundEffects } from "@/components/landing/event-container";

import { getEventStaticParams, getProject } from "@/lib/data";
import { getFontDelivery } from "@/lib/theme/font-delivery";
import { FONT_PRESETS } from "@/lib/theme/fonts";
import { resolveEventTheme } from "@/lib/theme/resolve";
import Logo from "@/public/logo.svg";

export async function generateMetadata({
	params,
}: PageProps<"/[eventUrl]">): Promise<Metadata> {
	"use cache";

	const { eventUrl } = await params;
	cacheTag(projectUrlCacheTag(eventUrl));
	const result = await getProject(eventUrl);

	if (!result?.project) {
		// Slug inexistente: metadados neutros com vida curta, como o
		// `null` de `getProject` — o 404 não fica preso por dias.
		cacheLife({ stale: 300, revalidate: 14400, expire: 28800 });
		return { title: "Evento" };
	}

	cacheTag(projectCacheTag(result.project.id));
	cacheLife("static");

	const { project } = result;
	const imageUrl =
		project.thumbnailUrl ||
		project.coverUrl ||
		project.largeLogoUrl ||
		project.logoUrl;

	return {
		title: { absolute: project.name, template: `%s · ${project.name}` },
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
		// Favicon direto do arquivo armazenado (quadrado desde o upload)
		// com variantes de esquema: o `logoDarkUrl` existia mas nunca era
		// usado no ícone da aba.
		icons: project.logoUrl
			? {
					icon: [
						{
							url: project.logoUrl,
							media: "(prefers-color-scheme: light)",
						},
						{
							url: project.logoDarkUrl || project.logoUrl,
							media: "(prefers-color-scheme: dark)",
						},
					],
				}
			: undefined,
		openGraph: {
			title: project.name,
			description: project.description || undefined,
			url: `/${eventUrl}`,
			siteName: "verifIC",
			images: imageUrl
				? [{ url: imageUrl, alt: `${project.name} image` }]
				: [],
			locale: "pt_BR",
			type: "website",
		},
		twitter: {
			card: "summary_large_image",
			title: project.name,
			description: project.description || undefined,
			images: imageUrl ? [imageUrl] : [],
		},
	};
}

export async function generateStaticParams() {
	return getEventStaticParams();
}

/**
 * Este layout lê `eventUrl` (dado de URL) para buscar o projeto, montar o
 * tema e barrar evento desconhecido com 404 real — tudo antes de qualquer
 * `<Suspense>`. Permite o bloqueio deste segmento; páginas abaixo seguem
 * validadas de forma independente.
 */
export const instant = false;

/**
 * Fallback **só do header**. O esqueleto de layout inteiro (hero `h-56` +
 * três cards) saiu: ele não tinha relação com a página real e era a primeira
 * pintura de toda carga direta, porque `{children}` e o rodapé ficavam dentro
 * da mesma fronteira. Agora só o header transmite (é a única árvore que lê
 * `usePathname()`), então este bloco reproduz a geometria dele — `h-21`
 * (84px), com `py-0` e `items-center` como no `EventHeader` real — para a
 * troca não deslocar o conteúdo abaixo. Logo (`h-8`) e botão de menu mobile
 * (`md:hidden`) seguem o mesmo recorte responsivo do header.
 */
function EventHeaderFallback() {
	return (
		<header
			className="container-p relative z-50 flex h-21 items-center justify-between"
			style={{ background: "var(--ev-header-bg)" }}
		>
			<Skeleton className="h-8 w-48" />
			<div className="hidden items-center gap-3 md:flex">
				<Skeleton className="h-9 w-24 rounded-md" />
				<Skeleton className="h-9 w-24 rounded-md" />
			</div>
			<Skeleton className="h-9 w-9 rounded-md md:hidden" />
		</header>
	);
}

interface EventLogoProps {
	light: string | null;
	dark: string | null;
	lightDims?: LogoDims;
	darkDims?: LogoDims;
	href: string;
}

interface LogoDims {
	width: number;
	height: number;
}

/** Só vale quando ambas existem (0/nulo = desconhecido). */
function exactDims(
	width: number | null | undefined,
	height: number | null | undefined,
): LogoDims | undefined {
	return width && height ? { width, height } : undefined;
}

/** Logos quadrados guardam só o lado (sempre 1:1). */
function squareDims(side: number | null | undefined): LogoDims | undefined {
	return side ? { width: side, height: side } : undefined;
}

/**
 * Logo do evento no cabeçalho.
 *
 * A variante escura só recebe `dark:hidden`/`hidden dark:block` quando
 * existe de fato: antes, a clara sumia no modo escuro e a escura não era
 * renderizada sem URL própria — o logo desaparecia por completo.
 */
function EventLogo({ light, dark, lightDims, darkDims, href }: EventLogoProps) {
	if (!light) {
		return (
			<Link href={href} className="text-(--ev-header-fg)">
				<Logo className="h-8" />
			</Link>
		);
	}

	return (
		<Link href={href} className="text-(--ev-header-fg)">
			<Image
				src={light}
				width={lightDims?.width ?? 150}
				height={lightDims?.height ?? 28}
				alt="Event logo"
				className={
					dark
						? "h-8 w-auto max-w-48 object-contain dark:hidden"
						: "h-8 w-auto max-w-48 object-contain"
				}
				priority
			/>
			{dark && (
				<Image
					src={dark}
					width={darkDims?.width ?? 150}
					height={darkDims?.height ?? 28}
					alt="Event logo"
					className="hidden h-8 w-auto max-w-48 object-contain dark:block"
					priority
				/>
			)}
		</Link>
	);
}

/**
 * Checks (`getProject` + `notFound`) run before the `<Suspense>`
 * boundary below is even created — so an unknown `eventUrl` produces a
 * real 404 instead of a streamed soft-404. A fronteira cobre só o header:
 * `EventHeader` → `MainNav` lê `usePathname()` e é a única árvore que
 * transmite (`usePathname` só suspende quando o param não vem do
 * `generateStaticParams`). `{children}` e o rodapé ficam fora, cada um com
 * o próprio esqueleto / `use cache`, para o esqueleto do layout não pintar
 * por cima do esqueleto da página em cada carga direta.
 */
export default async function EventLayout({
	children,
	params,
}: LayoutProps<"/[eventUrl]">) {
	const { eventUrl } = await params;
	const result = await getProject(eventUrl);

	if (!result?.project) {
		notFound();
	}

	const { project } = result;
	const gamification = parseGamificationConfig(project.gamification);
	const rankingEnabled =
		Boolean(project.profilesEnabled) &&
		gamification.enabled &&
		gamification.rankingEnabled;
	const rankingPublic = rankingEnabled && gamification.ranking.isPublic;
	const { cssVars, theme } = resolveEventTheme({
		theme: (project as { theme?: unknown }).theme,
		primaryColor: project.primaryColor,
		secondaryColor: project.secondaryColor,
	});
	const headingPreset = presetOfFamily(theme.fonts.heading.family);
	const bodyPreset = presetOfFamily(theme.fonts.body.family);
	const fontVariables = [
		headingPreset ? FONT_PRESETS[headingPreset].variable : null,
		bodyPreset ? FONT_PRESETS[bodyPreset].variable : null,
	]
		.filter(Boolean)
		.join(" ");
	const fontDelivery = getFontDelivery(theme);
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
			{fontDelivery.googleFontsUrl ? (
				<>
					<link
						rel="preconnect"
						href="https://fonts.googleapis.com"
					/>
					<link
						rel="preconnect"
						href="https://fonts.gstatic.com"
						crossOrigin="anonymous"
					/>
					<link rel="stylesheet" href={fontDelivery.googleFontsUrl} />
				</>
			) : null}
			<EventThemeSync cssVars={cssVars} />
			<EventBackgroundEffects />
			<div
				className={`event-public ${fontVariables} relative flex w-full flex-1 flex-col`}
				style={
					{
						...cssVars,
						"--font-sans": "var(--ev-font-body)",
					} as React.CSSProperties
				}
			>
				<Suspense fallback={<EventHeaderFallback />}>
					<EventHeader
						eventUrl={eventUrl}
						className="relative h-21 border-none py-0"
						rankingEnabled={rankingEnabled}
						rankingPublic={rankingPublic}
						logo={
							<EventLogo
								href={`/${eventUrl}`}
								light={project.largeLogoUrl || project.logoUrl}
								lightDims={
									project.largeLogoUrl
										? exactDims(
												project.largeLogoWidth,
												project.largeLogoHeight,
											)
										: squareDims(project.logoSide)
								}
								dark={
									project.largeLogoDarkUrl ||
									project.logoDarkUrl
								}
								darkDims={
									(project.largeLogoDarkUrl
										? exactDims(
												project.largeLogoDarkWidth,
												project.largeLogoDarkHeight,
											)
										: squareDims(project.logoDarkSide)) ??
									(project.largeLogoUrl
										? exactDims(
												project.largeLogoWidth,
												project.largeLogoHeight,
											)
										: squareDims(project.logoSide))
								}
							/>
						}
					/>
				</Suspense>
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
		</>
	);
}
