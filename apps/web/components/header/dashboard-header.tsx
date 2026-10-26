import Link from "next/link";

import type { RouterOutput } from "@verific/api";

import MainNav, { type MainNavProps } from "@/components/header/main-nav";

import { getSession } from "@/lib/session";
import Logo from "@/public/logo.svg";

import { ProjectSwitcher } from "./project-switcher";
import { UserNav } from "./user-nav";

interface Props {
	selectedProjectId?: string;
	projects: RouterOutput["getProjects"]["owned"];
	prefix: MainNavProps["prefix"];
	links: MainNavProps["links"];
	showAccountActions?: boolean;
}

export async function DashboardHeader({
	selectedProjectId,
	projects,
	prefix,
	links,
	showAccountActions = true,
}: Props) {
	const session = await getSession();

	return (
		<div className="md:px-container-h flex h-auto w-full flex-col items-center gap-4 border-b py-4 md:h-[var(--dashboard-header-height)] md:flex-row-reverse md:gap-0 md:py-0">
			<div className="px-container-h flex shrink-0 items-center justify-between gap-6 max-md:w-full md:ml-auto md:pl-0">
				{!!selectedProjectId && (
					<ProjectSwitcher
						selectedProjectId={selectedProjectId}
						projects={projects.map((project) => ({
							id: project.id,
							label: project.name,
							image: project.logoUrl,
							url: project.url,
							date: project.startDate.toISOString(),
						}))}
					/>
				)}
				{session?.user ? (
					<UserNav
						showAccountActions={showAccountActions}
						user={session?.user}
					/>
				) : null}
			</div>
			<MainNav prefix={prefix} links={links} showGradients />
			<Link
				href="/dashboard"
				prefetch={false}
				className="hidden shrink-0 md:flex"
			>
				<Logo className="h-5" />
			</Link>
		</div>
	);
}
