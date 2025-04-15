"use client";

// Components
import { SettingsCard } from "@/components/settings/settings-card";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function CustomizationSettings() {
	return (
		<>
			<SettingsCard
				title="Tema"
				description="Escolha o tema que você prefere usar."
			>
				<ThemeSwitcher />
			</SettingsCard>
		</>
	);
}
