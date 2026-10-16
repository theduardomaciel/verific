import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { presetOfFamily } from "@verific/drizzle/theme";
import { appUrl } from "@verific/env";

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
	const baseUrl = appUrl;
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
 * Este layout lê `eventUrl` (dado de URL) para buscar o projeto, montar o
 * tema e barrar evento desconhecido com 404 real — tudo antes de qualquer
 * `<Suspense>`. Permite o bloqueio deste segmento; páginas abaixo seguem
 * validadas de forma independente.
 */
export const instant = false;

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
	const headingPreset = presetOfFamily(theme.fonts.heading.family);
	const bodyPreset = presetOfFamily(theme.fonts.body.family);
	const fontVariables = [
		headingPreset ? FONT_PRESETS[headingPreset].variable : null,
		bodyPreset ? FONT_PRESETS[bodyPreset].variable : null,
		// TODO(Fase 3): remover; `font-dashboard` ainda é usado em páginas
		// de evento e migra para `font-heading`.
		FONT_PRESETS.rem.variable,
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
