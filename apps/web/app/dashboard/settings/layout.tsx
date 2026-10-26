import { Suspense } from "react";

import { SettingsSidebar } from "@/components/settings/sidebar";

import {
	dashboardProjectId,
	HydrateQueries,
	prefetch,
} from "@/lib/trpc/hydrate";

import { SettingsFormSkeleton } from "./skeleton";

const settingsLinks = [
	{
		href: "/settings",
		label: "Geral",
	},
	{
		href: "/settings/preferences",
		label: "Preferências",
	},
	{
		href: "/settings/team",
		label: "Equipe",
	},
	{
		href: "/settings/profile-layout",
		label: "Perfil",
	},
	{
		href: "/settings/gamification",
		label: "Gamificação",
	},
	{
		href: "/settings/theme",
		label: "Tema",
	},
	{
		href: "/settings/forms",
		label: "Formulários",
	},
	{
		href: "/settings/notifications",
		label: "Notificações",
	},
];

import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Configurações",
	description: "Configurações do projeto",
};

// As abas leem o evento por `useCurrentProject`
async function WithProject({ children }: { children: React.ReactNode }) {
	const id = await dashboardProjectId();
	return (
		<HydrateQueries
			queries={id ? [await prefetch("getProject", { id })] : []}
		>
			{children}
		</HydrateQueries>
	);
}

export default async function AccountSettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<main className="container-d py-container-v relative mx-auto min-h-[calc(100dvh-var(--dashboard-header-height))]">
			<h1 className="text-foreground mb-8 text-3xl font-bold">
				Configurações
			</h1>

			<div className="flex h-full flex-col gap-8 md:flex-row">
				<SettingsSidebar prefix={`/dashboard`} links={settingsLinks} />
				<div className="min-w-0 flex-1">
					<Suspense fallback={<SettingsFormSkeleton />}>
						<WithProject>{children}</WithProject>
					</Suspense>
				</div>
			</div>
		</main>
	);
}
