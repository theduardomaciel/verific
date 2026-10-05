"use client";

import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as EventContainer from "@/components/landing/event-container";
import { EventBackgroundEffects } from "@/components/landing/event-container";
import { ProfileBanner } from "@/components/profile/profile-banner";
import { ProfileInfo } from "@/components/profile/profile-info";
import { FormSection, type GenericForm } from "@/components/forms";
import { resolveEventTheme } from "@/lib/theme/resolve";
import type { EventTheme } from "@verific/drizzle/theme";

interface ThemePreviewProps {
	draft: EventTheme;
	projectName: string;
}

/** Dados de mentira só para a prévia (nunca dados reais). */
const FAKE_PROFILE = {
	name: "Fulana de Tal",
	avatarUrl: null,
	roleTitle: "Estudante de Psicologia",
	bio: "Bio de demonstração para ver o tema aplicado no perfil.",
	socials: [{ network: "github", url: "https://github.com/fulana" }],
	publicEmail: "fulana@exemplo.com",
	birth: { age: 22, formatted: "16 de março de 2004" },
	city: "Maceió, AL",
	institution: "Universidade Federal de Alagoas",
} as const;

function PreviewShell({
	draft,
	children,
}: {
	draft: EventTheme;
	children: React.ReactNode;
}) {
	const { cssVars } = resolveEventTheme({ theme: draft });
	return (
		<div
			className="dark relative min-h-[560px] overflow-hidden rounded-2xl border"
			style={cssVars as React.CSSProperties}
		>
			<EventBackgroundEffects />
			<div className="relative z-10">
				<div
					className="flex w-full items-center justify-between px-4 py-4 md:px-8"
					style={{ background: "var(--ev-header-bg)" }}
				>
					<span
						className="h-6 w-28 rounded"
						style={{ background: "var(--ev-content-accent)" }}
						aria-label="Logo do evento (prévia)"
					/>
					<nav className="flex items-center gap-4 text-xs font-semibold text-white">
						<span>Sobre</span>
						<span>Programação</span>
						<span className="rounded-full border border-white/40 px-3 py-1 uppercase">
							Inscrição
						</span>
					</nav>
				</div>
				{children}
			</div>
		</div>
	);
}

function FakeSubscribeForm() {
	const form = useForm({ defaultValues: {} });
	return (
		<Form {...(form as unknown as GenericForm)}>
			<form className="flex flex-col gap-4 p-4 md:p-8">
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

export function ThemePreview({ draft, projectName }: ThemePreviewProps) {
	return (
		<div className="flex flex-col gap-2 lg:sticky lg:top-4">
			<Tabs defaultValue="inicio">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="inicio">Início</TabsTrigger>
					<TabsTrigger value="inscricao">Inscrição</TabsTrigger>
					<TabsTrigger value="perfil">Perfil</TabsTrigger>
				</TabsList>
				<TabsContent value="inicio">
					<PreviewShell draft={draft}>
						<EventContainer.Hero coverUrl={null}>
							<div className="z-10 flex flex-1 flex-col items-start justify-center">
								<h1 className="font-heading mb-4 text-4xl font-bold text-white">
									{projectName}
								</h1>
								<Badge className="mb-4 rounded-xl bg-white px-4 py-1.5 text-primary">
									Aberto para o público externo
								</Badge>
								<Button className="ev-button font-semibold uppercase">
									Inscrever-se
								</Button>
							</div>
						</EventContainer.Hero>
						<div className="container-p flex flex-col gap-4 py-8">
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
					</PreviewShell>
				</TabsContent>
				<TabsContent value="inscricao">
					<PreviewShell draft={draft}>
						<EventContainer.Hero coverUrl={null}>
							<div className="z-10 flex flex-1 flex-col items-center justify-center">
								<h1 className="font-heading mb-4 text-center text-4xl font-bold text-white">
									Inscreva-se em <br />
									{projectName}
								</h1>
							</div>
						</EventContainer.Hero>
						<FakeSubscribeForm />
					</PreviewShell>
				</TabsContent>
				<TabsContent value="perfil">
					<PreviewShell draft={draft}>
						<div className="flex flex-col gap-6 p-4 md:p-8">
							<ProfileBanner
								name={FAKE_PROFILE.name}
								avatarUrl={FAKE_PROFILE.avatarUrl}
								subtitle={FAKE_PROFILE.roleTitle}
								bio={FAKE_PROFILE.bio}
								socials={[...FAKE_PROFILE.socials]}
								publicEmail={FAKE_PROFILE.publicEmail}
								showBioAndSocials
							/>
							<ProfileInfo
								data={{
									...FAKE_PROFILE,
									shortId: "demo",
									avatar: { kind: "initials" as const, url: null },
									socials: [...FAKE_PROFILE.socials],
								}}
							/>
						</div>
					</PreviewShell>
				</TabsContent>
			</Tabs>
			<PreviewShell draft={draft}>
				<div className="flex w-full items-center justify-center px-4 py-4">
					<div
						className="w-full rounded-full px-4 py-3 text-white md:px-8"
						style={{ background: "var(--ev-footer-bg)" }}
					>
						<div className="flex flex-wrap items-center justify-between gap-2 text-xs">
							<span>Feito com tecnologia verifIC (prévia)</span>
							<span className="opacity-70">
								Copyright 2026 verifIC. Todos os direitos reservados
							</span>
						</div>
					</div>
				</div>
			</PreviewShell>
		</div>
	);
}
