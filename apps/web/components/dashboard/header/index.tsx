import ProjectSwitcher from "./ProjectSwitcher";
import MainNav from "./PageLink";
import UserNav from "./UserNav";

export default function Header() {
	return (
		<div className="flex flex-col md:flex-row-reverse items-center py-6 border-b gap-6 w-full">
			<div className="max-md:w-full gap-6 justify-between md:ml-auto flex items-center px-dashboard">
				<ProjectSwitcher />
				<UserNav />
			</div>
			<MainNav />
		</div>
	);
}
