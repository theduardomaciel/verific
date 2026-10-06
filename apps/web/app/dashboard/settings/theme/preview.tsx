"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Menu, Moon, Sun } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as EventContainer from "@/components/landing/event-container";
import { EventBackgroundEffects } from "@/components/landing/event-container";
import { MOBILE_CTA_CLASS, MOBILE_NAV_CLASS } from "@/components/landing/event-nav";
import { ProfileBanner } from "@/components/profile/profile-banner";
import { ProfileStats } from "@/components/profile/profile-stats";
import { FormSection, type GenericForm } from "@/components/forms";
import { resolveEventTheme } from "@/lib/theme/resolve";
import { cn } from "@/lib/utils";
import type { EventTheme } from "@verific/drizzle/theme";

interface ThemePreviewProps {
	draft: EventTheme;
	projectName: string;
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

function HomeContent({ projectName }: { projectName: string }) {
	return (
		<>
			{/* Capa real: mesmo componente, mesmas camadas e tokens da página
			    pública (incluindo o véu base fixo). */}
			<EventContainer.Hero coverUrl={null}>
				<div
					className={`z-10 flex flex-1 flex-col items-start justify-center ${PAGE_X}`}
				>
					<EventContainer.Hero.Title>{projectName}</EventContainer.Hero.Title>
					<Badge className="mb-4 rounded-xl bg-white px-4 py-1.5 text-neutral-900">
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
					<h3 className="font-heading mb-2 text-xl font-medium">
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

function SubscribeContent({ projectName }: { projectName: string }) {
	return (
		<>
			<EventContainer.Hero coverUrl={null}>
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
			className="relative z-10 flex w-full shrink-0 items-center justify-between px-4 py-4 md:px-8"
			style={{ background: "var(--ev-header-bg)" }}
		>
			<span
				className="h-6 w-28 rounded"
				style={{ background: "var(--ev-content-accent)" }}
				aria-label="Logo do evento (prévia)"
			/>
			<nav className="flex items-center gap-2 text-xs font-medium md:gap-4">
				<span className={buttonVariants({ variant: "event-nav", size: "sm" })}>
					Sobre
				</span>
				<span
					className={buttonVariants({ variant: "event-nav", size: "sm" })}
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
					"bg-(--ev-mobile-menu-bg) text-(--ev-mobile-menu-fg) absolute inset-x-0 top-full z-20 flex h-96 flex-col items-start justify-center gap-8 px-8 transition-opacity",
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

export function ThemePreview({ draft, projectName }: ThemePreviewProps) {
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

	return (
		<div className="flex min-w-0 flex-col gap-3">
			<div className="flex items-center justify-between gap-2">
				<Tabs value={tab} onValueChange={(v) => setTab(v as PreviewTab)}>
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="inicio">Início</TabsTrigger>
						<TabsTrigger value="inscricao">Inscrição</TabsTrigger>
						<TabsTrigger value="perfil">Perfil</TabsTrigger>
					</TabsList>
				</Tabs>
				<Button
					variant="outline"
					size="icon"
					title={
						dark ? "Ver prévia no modo claro" : "Ver prévia no modo escuro"
					}
					aria-label={
						dark ? "Ver prévia no modo claro" : "Ver prévia no modo escuro"
					}
					onClick={() => setDark((d) => !d)}
				>
					{dark ? <Sun /> : <Moon />}
				</Button>
			</div>

			{/* Um único "navegador": header + conteúdo + footer, rolando por dentro.
			    translateZ(0) faz descendentes `fixed` se posicionarem em relação a ele. */}
			<div
				className={cn(
					"bg-background text-foreground relative isolate flex h-[70dvh] min-h-[480px] transform-[translateZ(0)] flex-col overflow-x-hidden overflow-y-auto rounded-2xl border lg:h-[calc(100dvh-11rem)]",
					dark ? "dark" : "ev-theme-light",
				)}
				style={cssVars as React.CSSProperties}
			>
				<EventBackgroundEffects />

				<PreviewHeader
					menuOpen={menuOpen}
					onToggleMenu={() => setMenuOpen((o) => !o)}
				/>

				<main className="relative z-10 flex-1">
					{tab === "inicio" && (
						<HomeContent projectName={projectName} />
					)}
					{tab === "inscricao" && (
						<SubscribeContent projectName={projectName} />
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
							<span>Feito com tecnologia verifIC (prévia)</span>
							<span className="text-(--ev-footer-fg-soft)">
								Copyright 2026 verifIC. Todos os direitos
								reservados
							</span>
						</div>
					</div>
				</footer>
			</div>
		</div>
	);
}
