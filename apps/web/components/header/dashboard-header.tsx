// Components
import MainNav, { type MainNavProps } from "@/components/header/main-nav";
import { ProjectSwitcher } from "./project-switcher";
import { UserNav } from "./user-nav";

// API
import { auth } from "@verific/auth";

// Types
import { RouterOutput } from "@verific/api";

interface Props {
	selectedProjectId: string;
	projects: RouterOutput["getProjects"];
	prefix: MainNavProps["prefix"];
	links: MainNavProps["links"];
	showProjectSwitcher?: boolean;
	showAccountActions?: boolean;
}

export async function DashboardHeader({
	selectedProjectId,
	projects,
	prefix,
	links,
	showProjectSwitcher = true,
	showAccountActions = true,
}: Props) {
	const session = await auth();

	return (
		<div className="px-container-h flex w-full flex-col items-center gap-6 border-b py-4 md:flex-row-reverse">
			<div className="flex items-center justify-between gap-6 max-md:w-full md:ml-auto">
				{showProjectSwitcher && (
					<ProjectSwitcher
						selectedProjectId={selectedProjectId}
						projects={projects.map((project) => ({
							id: project.id,
							label: project.name,
							image: project.thumbnailUrl,
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
			<MainNav prefix={prefix} links={links} />
		</div>
	);
}
