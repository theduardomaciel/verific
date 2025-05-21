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

import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Configurações",
};

export default function AccountSettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<main className="container-p py-container-v relative mx-auto min-h-screen px-4">
			<h1 className="text-foreground mb-8 text-3xl font-bold">
				Configurações
			</h1>

			<div className="flex h-full flex-col gap-8 md:flex-row">
				<SettingsSidebar links={settingsLinks} />
				<div className="flex-1">{children}</div>
			</div>
		</main>
	);
}
