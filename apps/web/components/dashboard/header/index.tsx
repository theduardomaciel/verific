// Components
import MainNav, { type MainNavProps } from "./page-link";
import ProjectSwitcher from "./project-switcher";
import UserNav from "./user-nav";

interface Props {
	links: MainNavProps["links"];
	showProjectSwitcher?: boolean;
	showAccountActions?: boolean;
}

export function Header({
	links,
	showProjectSwitcher = true,
	showAccountActions = true,
}: Props) {
	return (
		<div className="flex flex-col md:flex-row-reverse items-center py-4 border-b gap-6 w-full">
			<div className="max-md:w-full gap-6 justify-between md:ml-auto flex items-center px-dashboard">
				{showProjectSwitcher && <ProjectSwitcher />}
				<UserNav showAccountActions={showAccountActions} />
			</div>
			<MainNav links={links} />
		</div>
	);
}
