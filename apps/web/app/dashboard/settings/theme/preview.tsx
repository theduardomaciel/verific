"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as EventContainer from "@/components/landing/event-container";
import { EventBackgroundEffects } from "@/components/landing/event-container";
import { ProfileBanner } from "@/components/profile/profile-banner";
import { ProfileStats } from "@/components/profile/profile-stats";
import { FormSection, type GenericForm } from "@/components/forms";
import { resolveEventTheme } from "@/lib/theme/resolve";
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
		{ label: "Cidade", icon: "map-pin", value: "Maceió, AL", hidden: false },
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
			<EventContainer.Hero coverUrl={null}>
				<div className="z-10 flex flex-1 flex-col items-start justify-center">
					<h1 className="font-heading mb-4 text-4xl font-bold text-white">
						{projectName}
					</h1>
					<Badge className="text-primary mb-4 rounded-xl bg-white px-4 py-1.5">
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
			</div>
		</>
	);
}

function SubscribeContent({ projectName }: { projectName: string }) {
	return (
		<>
			<EventContainer.Hero coverUrl={null}>
				<div className="z-10 flex flex-1 flex-col items-center justify-center">
					<h1 className="font-heading mb-4 text-center text-4xl font-bold text-white">
						Inscreva-se em <br />
						{projectName}
					</h1>
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
				}}
			/>
		</div>
	);
}

export function ThemePreview({ draft, projectName }: ThemePreviewProps) {
	const [tab, setTab] = useState<PreviewTab>("inicio");
	const { cssVars } = useMemo(
		() => resolveEventTheme({ theme: draft }),
		[draft],
	);

	return (
		<div className="flex min-w-0 flex-col gap-3">
			<Tabs value={tab} onValueChange={(v) => setTab(v as PreviewTab)}>
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="inicio">Início</TabsTrigger>
					<TabsTrigger value="inscricao">Inscrição</TabsTrigger>
					<TabsTrigger value="perfil">Perfil</TabsTrigger>
				</TabsList>
			</Tabs>

			{/* Um único "navegador": header + conteúdo + footer, rolando por dentro.
			    translateZ(0) faz descendentes `fixed` se posicionarem em relação a ele. */}
			<div
				className="dark bg-background text-foreground relative isolate flex h-[70dvh] min-h-[480px] [transform:translateZ(0)] flex-col overflow-x-hidden overflow-y-auto rounded-2xl border lg:h-[calc(100dvh-11rem)]"
				style={cssVars as React.CSSProperties}
			>
				<EventBackgroundEffects />

				<header
					className="relative z-10 flex w-full shrink-0 items-center justify-between px-4 py-4 md:px-8"
					style={{ background: "var(--ev-header-bg)" }}
				>
					<span
						className="h-6 w-28 rounded"
						style={{ background: "var(--ev-content-accent)" }}
						aria-label="Logo do evento (prévia)"
					/>
					<nav className="flex items-center gap-3 text-xs font-semibold text-white md:gap-4">
						<span className="hidden sm:inline">Sobre</span>
						<span className="hidden sm:inline">Programação</span>
						<span className="rounded-full border border-white/40 px-3 py-1 uppercase">
							Inscrição
						</span>
					</nav>
				</header>

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
						className="rounded-full px-4 py-3 text-white md:px-8"
						style={{ background: "var(--ev-footer-bg)" }}
					>
						<div className="flex flex-wrap items-center justify-between gap-2 text-xs">
							<span>Feito com tecnologia verifIC (prévia)</span>
							<span className="opacity-70">
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
