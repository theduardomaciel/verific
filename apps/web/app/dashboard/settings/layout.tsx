import { notFound } from "next/navigation";
import { Suspense } from "react";

import type { ProjectPermission } from "@verific/drizzle/permissions";

import { SettingsSidebar } from "@/components/settings/sidebar";

import {
	dashboardProjectId,
	HydrateQueries,
	prefetch,
} from "@/lib/trpc/hydrate";
import { getCachedProjectAccess } from "@/lib/trpc/server";

import { SettingsFormSkeleton } from "./skeleton";

const settingsLinks: Array<{
	href: string;
	label: string;
	permission: ProjectPermission;
}> = [
	{ href: "/settings", label: "Geral", permission: "event.manage" },
	{
		href: "/settings/preferences",
		label: "Preferências",
		permission: "event.manage",
	},
	{ href: "/settings/team", label: "Equipe", permission: "team.manage" },
	{
		href: "/settings/profile-layout",
		label: "Perfil",
		permission: "event.manage",
	},
	{
		href: "/settings/gamification",
		label: "Gamificação",
		permission: "ranking.manage",
	},
	{ href: "/settings/theme", label: "Tema", permission: "event.manage" },
	{
		href: "/settings/forms",
		label: "Formulários",
		permission: "event.manage",
	},
	{
		href: "/settings/notifications",
		label: "Notificações",
		permission: "emails.manage",
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

async function SettingsShell({ children }: { children: React.ReactNode }) {
	const id = await dashboardProjectId();
	if (!id) notFound();

	const access = await getCachedProjectAccess(id);
	const can = (permission: ProjectPermission) =>
		access.isOwner || access.permissions.includes(permission);

	const links = settingsLinks
		.filter((link) => can(link.permission))
		.map(({ permission: _permission, ...link }) => link);

	// Nenhuma permissão de configuração: a rota não existe para este membro.
	if (links.length === 0) notFound();

	return (
		<main className="container-d py-container-v relative mx-auto min-h-[calc(100dvh-var(--dashboard-header-height))]">
			<h1 className="text-foreground mb-8 text-3xl font-bold">
				Configurações
			</h1>

			<div className="flex h-full flex-col gap-8 md:flex-row">
				<SettingsSidebar prefix={`/dashboard`} links={links} />
				<div className="min-w-0 flex-1">
					<Suspense fallback={<SettingsFormSkeleton />}>
						<WithProject>{children}</WithProject>
					</Suspense>
				</div>
			</div>
		</main>
	);
}

export default async function AccountSettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <SettingsShell>{children}</SettingsShell>;
}
