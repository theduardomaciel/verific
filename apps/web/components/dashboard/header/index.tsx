// Components
import MainNav, { type MainNavProps } from "./PageLink";
import ProjectSwitcher from "./ProjectSwitcher";
import UserNav from "./UserNav";

interface Props {
	links: MainNavProps["links"];
	showProjectSwitcher?: boolean;
}

export function Header({ links, showProjectSwitcher = true }: Props) {
	return (
		<div className="flex flex-col md:flex-row-reverse items-center py-4 border-b gap-6 w-full">
			<div className="max-md:w-full gap-6 justify-between md:ml-auto flex items-center px-dashboard">
				{showProjectSwitcher && <ProjectSwitcher className="hidden md:flex" />}
				<UserNav />
			</div>
			<MainNav links={links} />
		</div>
	);
}
