"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2, Menu, Moon, Sun } from "lucide-react";
import { useForm } from "react-hook-form";

import type { EventTheme } from "@verific/drizzle/theme";
import type { FontRole } from "@verific/fonts";
import { buildSizeAdjust } from "@verific/fonts";
import { getAspect } from "@verific/fonts/aspects";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { FormSection, type GenericForm } from "@/components/forms";
import * as EventContainer from "@/components/landing/event-container";
import { EventBackgroundEffects } from "@/components/landing/event-container";
import {
	EVENT_BADGE_COLORS,
	MOBILE_CTA_CLASS,
	MOBILE_NAV_CLASS,
} from "@/components/landing/event-nav";
import { ProfileBanner } from "@/components/profile/profile-banner";
import { ProfileStats } from "@/components/profile/profile-stats";

import { resolveEventTheme } from "@/lib/theme/resolve";
import { cn } from "@/lib/utils";

import {
	ensureFullStylesheet,
	fontStack,
	useFontFaceStatus,
} from "./font-loading";

import type { FontHoverHint } from "./font-picker-utils";

interface ThemePreviewProps {
	draft: EventTheme;
	projectName: string;
	/** Prévia temporária do picker (não altera o rascunho). */
	fontHints?: Record<FontRole, FontHoverHint | null>;
}

type PreviewTab = "inicio" | "inscricao" | "perfil";

/** Dados de mentira só para a prévia (nunca dados reais). */
const FAKE_PROFILE = {
	name: "Fulana de Tal",
	avatarUrl: null,
	roleTitle: "Estudante de Psicologia",
	bio: "Bio de demonstração para ver o tema aplicado no perfil.",
	socials: [
		{
			service: "github",
			url: "https://github.com/fulana",
			display: "fulana",
		},
	],
	publicEmail: "fulana@exemplo.com",
	stats: [
		{
			label: "Cidade",
			icon: "map-pin",
			value: "Maceió, AL",
			hidden: false,
		},
	],
} as const;

/** Mesma largura/padding horizontal para todo o conteúdo da prévia. */
const PAGE_X = "mx-auto w-full max-w-5xl px-4 md:px-8";

function FakeSubscribeForm() {
	const form = useForm({ defaultValues: {} });
	return (
		<Form {...(form as unknown as GenericForm)}>
			<form className={`${PAGE_X} flex flex-col gap-4 py-6`}>
				<FormSection
					title="Identificação"
					section={0}
					form={form as unknown as GenericForm}
					fields={[{ name: "E-mail", value: true }]}
				>
					<Input placeholder="voce@exemplo.com" readOnly />
				</FormSection>
				<FormSection
					title="Perfil no evento"
					section={1}
					form={form as unknown as GenericForm}
					fields={[{ name: "Perfil", value: true }]}
				>
					<div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
						<Input placeholder="Cargo / curso" readOnly />
						<Input placeholder="Cidade" readOnly />
					</div>
				</FormSection>
			</form>
		</Form>
	);
}

function HomeContent({
	draft,
	projectName,
}: {
	draft: EventTheme;
	projectName: string;
}) {
	return (
		<>
			{/* Capa real: mesmo componente, mesmas camadas e tokens da página
			    pública (incluindo o véu base fixo). */}
			<EventContainer.Hero coverUrl={null} showImage={draft.hero.image}>
				<div
					className={`z-10 flex flex-1 flex-col items-start justify-center ${PAGE_X}`}
				>
					<EventContainer.Hero.Title>
						{projectName}
					</EventContainer.Hero.Title>
					<Badge
						className={cn(
							"mb-4 rounded-xl px-4 py-1.5",
							EVENT_BADGE_COLORS,
						)}
					>
						Aberto para o público externo
					</Badge>
					<Button className="ev-button font-semibold uppercase">
						Inscrever-se
					</Button>
				</div>
			</EventContainer.Hero>
			<div className={`${PAGE_X} flex flex-col gap-4 py-8`}>
				<div
					className="border p-6"
					style={{ borderRadius: "var(--ev-card-radius)" }}
				>
					<h3 className="font-subtitle mb-2 text-xl font-medium">
						Local
					</h3>
					<p className="text-muted-foreground text-sm">
						Prévia dos cartões de conteúdo
					</p>
				</div>
				<div
					className="border p-6"
					style={{ borderRadius: "var(--ev-card-radius)" }}
				>
					<Skeleton className="mb-3 h-5 w-1/2" />
					<Skeleton className="mb-2 h-3 w-full" />
					<Skeleton className="h-3 w-2/3" />
					<p className="text-muted-foreground mt-3 text-sm">
						Prévia da cor dos carregamentos
					</p>
				</div>
			</div>
		</>
	);
}

function SubscribeContent({
	draft,
	projectName,
}: {
	draft: EventTheme;
	projectName: string;
}) {
	return (
		<>
			<EventContainer.Hero coverUrl={null} showImage={draft.hero.image}>
				<div className="z-10 flex flex-1 flex-col items-center justify-center">
					<EventContainer.Hero.Title className="text-center">
						Inscreva-se em <br />
						{projectName}
					</EventContainer.Hero.Title>
				</div>
			</EventContainer.Hero>
			<FakeSubscribeForm />
		</>
	);
}

function ProfileContent() {
	return (
		<div className={`${PAGE_X} flex flex-col gap-6 py-6`}>
			<ProfileBanner
				name={FAKE_PROFILE.name}
				avatarUrl={FAKE_PROFILE.avatarUrl}
				subtitle={FAKE_PROFILE.roleTitle}
				bio={FAKE_PROFILE.bio}
				socials={[...FAKE_PROFILE.socials]}
				publicEmail={FAKE_PROFILE.publicEmail}
				showBioAndSocials
			/>
			<ProfileStats
				data={{
					name: FAKE_PROFILE.name,
					stats: [...FAKE_PROFILE.stats],
					showConnections: true,
					showBadges: true,
				}}
			/>
		</div>
	);
}

/**
 * Cabeçalho da prévia: mesmas classes dos variants `event-nav`/`event-cta`
 * do `Button` e o mesmo fundo do header real, tudo lendo os tokens do
 * rascunho. `aria-current="page"` fixa o estado ativo para dar para conferir
 * o token `--ev-nav-active-*`.
 */
function PreviewHeader({
	menuOpen,
	onToggleMenu,
}: {
	menuOpen: boolean;
	onToggleMenu: () => void;
}) {
	return (
		<header
			// Mesma altura fixa do cabeçalho real (`h-21`): o gradiente com
			// altura "capa" estende esse exato valor para trás do cabeçalho.
			className="relative z-10 flex h-21 w-full shrink-0 items-center justify-between px-4 md:px-8"
			style={{ background: "var(--ev-header-bg)" }}
		>
			<span
				className="h-6 w-28 rounded bg-(--ev-content-accent) dark:bg-(--ev-content-accent-dark)"
				aria-label="Logo do evento (prévia)"
			/>
			<nav className="flex items-center gap-2 text-xs font-medium md:gap-4">
				<span
					className={buttonVariants({
						variant: "event-nav",
						size: "sm",
					})}
				>
					Sobre
				</span>
				<span
					className={buttonVariants({
						variant: "event-nav",
						size: "sm",
					})}
					aria-current="page"
				>
					Programação
				</span>
				<span
					className={cn(
						buttonVariants({ variant: "event-cta", size: "sm" }),
						"font-semibold uppercase",
					)}
				>
					Inscrição
				</span>
				{/* Botão que abre o menu — mesma leitura por token do header real. */}
				<Button
					variant="event-nav"
					size="icon-sm"
					className="ml-1 md:hidden"
					aria-label="Alternar menu"
					aria-expanded={menuOpen}
					onClick={onToggleMenu}
				>
					<Menu />
				</Button>
			</nav>

			{/* Menu mobile da prévia: mesmos tokens e classes da página real,
			    em posição absoluta dentro do container do preview. */}
			<div
				className={cn(
					"absolute inset-x-0 top-full z-20 flex h-96 flex-col items-start justify-center gap-8 bg-(--ev-mobile-menu-bg) px-8 text-(--ev-mobile-menu-fg) transition-opacity",
					menuOpen ? "opacity-100" : "pointer-events-none opacity-0",
				)}
			>
				<span className={cn("text-xl font-medium", MOBILE_NAV_CLASS)}>
					Sobre
				</span>
				<span
					className={cn("text-xl font-medium", MOBILE_NAV_CLASS)}
					aria-current="page"
				>
					Programação
				</span>
				<span className={MOBILE_CTA_CLASS}>Inscrição</span>
			</div>
		</header>
	);
}

export function ThemePreview({
	draft,
	projectName,
	fontHints,
}: ThemePreviewProps) {
	const [tab, setTab] = useState<PreviewTab>("inicio");
	// A página real segue a preferência do visitante (`next-themes`); a
	// prévia começa no escuro, que é como a maioria vê eventos, e o botão
	// alterna para conferir o modo claro.
	//
	// O modo claro precisa da classe `ev-theme-light` (não basta remover
	// `dark`): os tokens do tema são herdados do `<html>`, que continua com
	// `dark` para quem usa o sistema escuro — só uma declaração no próprio
	// elemento vence a herança. A mesma classe desliga as variantes `dark:`
	// dentro da prévia (ver `@custom-variant dark` em `globals.css`).
	const [dark, setDark] = useState(true);
	const [menuOpen, setMenuOpen] = useState(false);
	const { cssVars } = useMemo(
		() => resolveEventTheme({ theme: draft }),
		[draft],
	);

	// Fontes do rascunho + dica temporária do picker (hover/teclado): a
	// prévia reflete na hora, sem esperar o salvamento.
	const headingHint = fontHints?.heading ?? null;
	const subtitleHint = fontHints?.subtitle ?? null;
	const bodyHint = fontHints?.body ?? null;
	const displayVars: Record<string, string> = { ...cssVars };
	if (headingHint) {
		displayVars["--ev-font-heading"] = fontStack(
			headingHint.family,
			headingHint.category,
		);
	}
	if (subtitleHint) {
		displayVars["--ev-font-subtitle"] = fontStack(
			subtitleHint.family,
			subtitleHint.category,
		);
	}
	if (bodyHint) {
		displayVars["--ev-font-body"] = fontStack(
			bodyHint.family,
			bodyHint.category,
		);
	}
	// Ajuste de tamanho das dicas (escala do papel × métrica da família).
	const hintAdjustVars: Record<string, string> = {};
	const hintAdjusts = [
		["--ev-font-heading-adjust", headingHint, draft.fonts.heading.scale],
		["--ev-font-subtitle-adjust", subtitleHint, draft.fonts.subtitle.scale],
		["--ev-font-body-adjust", bodyHint, draft.fonts.body.scale],
	] as const;
	for (const [cssVar, hint, scale] of hintAdjusts) {
		if (!hint) continue;
		const adjust = buildSizeAdjust(getAspect(hint.family), scale);
		if (adjust !== null) hintAdjustVars[cssVar] = String(adjust);
	}
	Object.assign(displayVars, hintAdjustVars);

	// Garante as faces do rascunho e das dicas na prévia (CDN no editor).
	useEffect(() => {
		const selections = [
			draft.fonts.heading,
			draft.fonts.subtitle,
			draft.fonts.body,
		];
		for (const selection of selections) {
			ensureFullStylesheet(
				selection.family,
				selection.weights,
				selection.italic === true,
			);
		}
		for (const hint of [headingHint, subtitleHint, bodyHint]) {
			if (hint) ensureFullStylesheet(hint.family, [hint.weight], false);
		}
	}, [draft.fonts, headingHint, subtitleHint, bodyHint]);

	const headingStatus = useFontFaceStatus(
		headingHint?.family ?? draft.fonts.heading.family,
		headingHint?.weight ?? draft.fonts.heading.weights[0] ?? 400,
	);
	const subtitleStatus = useFontFaceStatus(
		subtitleHint?.family ?? draft.fonts.subtitle.family,
		subtitleHint?.weight ?? draft.fonts.subtitle.weights[0] ?? 400,
	);
	const bodyStatus = useFontFaceStatus(
		bodyHint?.family ?? draft.fonts.body.family,
		bodyHint?.weight ?? draft.fonts.body.weights[0] ?? 400,
	);
	const fontsLoading =
		headingStatus === "loading" ||
		subtitleStatus === "loading" ||
		bodyStatus === "loading";

	return (
		<div className="flex min-w-0 flex-col gap-3">
			<div className="flex items-center justify-between gap-2">
				<Tabs
					value={tab}
					onValueChange={(v) => setTab(v as PreviewTab)}
				>
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="inicio">Início</TabsTrigger>
						<TabsTrigger value="inscricao">Inscrição</TabsTrigger>
						<TabsTrigger value="perfil">Perfil</TabsTrigger>
					</TabsList>
				</Tabs>
				<div className="flex items-center gap-2">
					{fontsLoading && (
						<span
							role="status"
							className="text-muted-foreground inline-flex items-center gap-1 text-xs"
						>
							<Loader2
								className="h-3.5 w-3.5 animate-spin"
								aria-hidden
							/>
							Carregando fontes…
						</span>
					)}
					<Button
						variant="outline"
						size="icon"
						title={
							dark
								? "Ver prévia no modo claro"
								: "Ver prévia no modo escuro"
						}
						aria-label={
							dark
								? "Ver prévia no modo claro"
								: "Ver prévia no modo escuro"
						}
						onClick={() => setDark((d) => !d)}
					>
						{dark ? <Sun /> : <Moon />}
					</Button>
				</div>
			</div>

			{/* Um único "navegador": header + conteúdo + footer, rolando por dentro.
			    translateZ(0) faz descendentes `fixed` se posicionarem em relação a ele.
			    O invólucro ancora os efeitos (topo/fundo) na altura total do
			    conteúdo: direto no rolador, o `inset-0` cobriria só a caixa
			    visível e o gradiente inferior não chegaria ao rodapé.
			    Importante: o invólucro NÃO usa `flex-1` (basis 0 o prenderia à
			    altura visível, deixando o conteúdo transbordar). Com basis
			    `auto` + `shrink-0` ele cresce com o conteúdo, e `min-h-full`
			    garante pelo menos a altura da caixa. */}
			<div
				className={cn(
					"bg-background text-foreground relative isolate flex h-[70dvh] min-h-[480px] transform-[translateZ(0)] flex-col overflow-x-hidden overflow-y-auto rounded-2xl border lg:h-[calc(100dvh-11rem)]",
					dark ? "dark" : "ev-theme-light",
				)}
				style={
					{
						...displayVars,
						// Texto corrido herda o ajuste (como `.event-public`
						// faz na página real).
						fontSizeAdjust: "var(--ev-font-body-adjust, from-font)",
					} as React.CSSProperties
				}
			>
				<div className="relative flex min-h-full shrink-0 flex-col">
					<EventBackgroundEffects />

					<PreviewHeader
						menuOpen={menuOpen}
						onToggleMenu={() => setMenuOpen((o) => !o)}
					/>

					<main className="relative z-10 flex-1">
						{tab === "inicio" && (
							<HomeContent
								draft={draft}
								projectName={projectName}
							/>
						)}
						{tab === "inscricao" && (
							<SubscribeContent
								draft={draft}
								projectName={projectName}
							/>
						)}
						{tab === "perfil" && <ProfileContent />}
					</main>

					<footer className="relative z-10 shrink-0 px-4 py-4 md:px-8">
						<div
							className="rounded-full px-4 py-3 md:px-8"
							style={{
								background: "var(--ev-footer-bg)",
								color: "var(--ev-footer-fg)",
							}}
						>
							<div className="flex flex-wrap items-center justify-between gap-2 text-xs">
								<span>
									Feito com tecnologia verifIC (prévia)
								</span>
								<span className="text-(--ev-footer-fg-soft)">
									Copyright 2026 verifIC. Todos os direitos
									reservados
								</span>
							</div>
						</div>
					</footer>
				</div>
			</div>
		</div>
	);
}
