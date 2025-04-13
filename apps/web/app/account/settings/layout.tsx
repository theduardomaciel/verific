import { SettingsSidebar } from "@/components/settings/sidebar";

const settingsLinks = [
	{
		href: "/account/settings",
		label: "Geral",
	},
	{
		href: "/account/settings/customization",
		label: "Customização",
	},
	{
		href: "/account/settings/language",
		label: "Idioma",
	},
];

export default function AccountSettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<main className="container mx-auto py-8 px-4 max-w-6xl min-h-screen relative">
			<h1 className="text-3xl font-bold text-foreground mb-8">Configurações</h1>

			<div className="flex flex-col md:flex-row gap-8 h-full">
				<SettingsSidebar links={settingsLinks} />
				<div className="flex-1">{children}</div>
			</div>
		</main>
	);
}
