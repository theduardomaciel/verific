"use client";

import { SettingsCard } from "@/components/settings/settings-card";
import { ToDo } from "@/components/to-do";

export function ProjectSettingsLanguageForm() {
	return (
		<main className="flex flex-1 flex-col gap-6">
			<SettingsCard
				title="Idioma do Evento"
				description="Selecione o idioma principal para a página do seu evento e comunicações."
				footer={{
					text: "As alterações de idioma serão aplicadas globalmente.",
				}}
			>
				<ToDo />
			</SettingsCard>
		</main>
	);
}
