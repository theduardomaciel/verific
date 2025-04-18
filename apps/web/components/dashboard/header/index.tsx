// Components
import MainNav, { type MainNavProps } from "@/components/main-nav";
import { ProjectSwitcher } from "./project-switcher";
import { UserNav } from "./user-nav";

interface Props {
	prefix: MainNavProps["prefix"];
	links: MainNavProps["links"];
	showProjectSwitcher?: boolean;
	showAccountActions?: boolean;
}

export function DashboardHeader({
	prefix,
	links,
	showProjectSwitcher = true,
	showAccountActions = true,
}: Props) {
	return (
		<div className="flex w-full flex-col items-center gap-6 border-b py-4 md:flex-row-reverse">
			<div className="px-dashboard flex items-center justify-between gap-6 max-md:w-full md:ml-auto">
				{showProjectSwitcher && <ProjectSwitcher />}
				<UserNav showAccountActions={showAccountActions} />
			</div>
			<MainNav prefix={prefix} links={links} />
		</div>
	);
}
