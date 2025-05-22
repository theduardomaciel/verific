import { SettingsSidebar } from "@/components/settings/sidebar";

const settingsLinks = [
	{
		href: "/settings",
		label: "Geral",
	},
	{
		href: "/settings/preferences",
		label: "Preferências",
	},
	{
		href: "/settings/subscriptions",
		label: "Inscrições",
	},
	{
		href: "/settings/security",
		label: "Segurança",
		disabled: true,
	},
	{
		href: "/settings/accessibility",
		label: "Acessibilidade",
		disabled: true,
	},
	{
		href: "/settings/notifications",
		label: "Notificações",
		disabled: true,
	},
];

import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Configurações",
};

export default async function AccountSettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<main className="container-d py-container-v relative mx-auto min-h-screen">
			<h1 className="text-foreground mb-8 text-3xl font-bold">
				Configurações
			</h1>

			<div className="flex h-full flex-col gap-8 md:flex-row">
				<SettingsSidebar prefix={`/dashboard`} links={settingsLinks} />
				<div className="flex-1">{children}</div>
			</div>
		</main>
	);
}
