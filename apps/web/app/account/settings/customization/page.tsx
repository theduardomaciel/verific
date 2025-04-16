import { Fragment } from "react";

// Components
import { SettingsCard } from "@/components/settings/settings-card";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function CustomizationSettings() {
	return (
		<Fragment>
			<SettingsCard
				title="Tema"
				description="Escolha o tema que você prefere usar."
			>
				<ThemeSwitcher />
			</SettingsCard>
		</Fragment>
	);
}
