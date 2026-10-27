import type { Metadata } from "next";
import { REM } from "next/font/google";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import type { ProjectPermission } from "@verific/drizzle/permissions";

import { DashboardProvider } from "@/components/dashboard/dashboard-context";
import { Footer } from "@/components/footer";
import { DashboardHeader } from "@/components/header/dashboard-header";

import { isAuthError, redirectToSignIn } from "@/lib/auth-redirect";
import {
	getCachedAccountProjects,
	getCachedProjectAccess,
} from "@/lib/trpc/server";

const rem = REM({
	variable: "--font-rem",
	subsets: ["latin"],
});

const DASHBOARD_LINKS: Array<{
	href: string;
	label: string;
	permission?: ProjectPermission;
}> = [
	{ href: "", label: "Visão Geral" },
	{
		href: "/activities",
		label: "Atividades",
		permission: "activities.manage",
	},
	{
		href: "/participants",
		label: "Participantes",
		permission: "participants.view",
	},
	{ href: "/reception", label: "Recepção", permission: "reception.manage" },
	{ href: "/emails", label: "E-mails", permission: "emails.manage" },
	{ href: "/settings", label: "Configurações", permission: "event.manage" },
];

export const metadata: Metadata = {
	title: "Dashboard",
};

async function DashboardLayoutContent({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const cookieStore = await cookies();
	const projectId = cookieStore.get("projectId")?.value;

	if (!projectId) {
		redirect("/account");
	}

	let projects;

	try {
		projects = await getCachedAccountProjects();
	} catch (error) {
		if (isAuthError(error)) {
			await redirectToSignIn();
		}
		// Falha do banco não é página inexistente: vai para o error boundary
		throw error;
	}

	const allProjects = projects.owned.concat(projects.shared);
	const currentProject = allProjects.find(
		(project) => project.id === projectId,
	);

	if (!currentProject) {
		notFound();
	}

	const projectUrl = currentProject.url;
	const access = await getCachedProjectAccess(projectId);
	const isOwner = access.isOwner;
	const can = (permission: ProjectPermission) =>
		isOwner || access.permissions.includes(permission);
	const links = DASHBOARD_LINKS.filter((link) =>
		link.permission ? can(link.permission) : true,
	).map(({ permission: _permission, ...link }) => link);

	return (
		<div
			className={`${rem.variable} flex w-full flex-1 flex-col items-center`}
		>
			<DashboardHeader
				prefix={`/dashboard`}
				selectedProjectId={projectId}
				projects={allProjects}
				links={links}
			/>
			<DashboardProvider
				projectId={projectId}
				projectUrl={projectUrl}
				isOwner={isOwner}
				role={access.role}
				permissions={access.permissions}
			>
				{children}
			</DashboardProvider>
			<Footer />
		</div>
	);
}

export default function DashboardLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<Suspense
			fallback={
				<div
					className="min-h-[calc(100dvh-var(--dashboard-header-height))] w-full"
					aria-hidden
				/>
			}
		>
			<DashboardLayoutContent>{children}</DashboardLayoutContent>
		</Suspense>
	);
}
