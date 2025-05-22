"use client";

import { ToDo } from "@/components/to-do";
import { SettingsCard } from "@/components/settings/settings-card"; // Exemplo, caso queira usar cards

// tRPC e RouterOutput seriam necessários se houvesse interações com o backend aqui.
// import { trpc } from "@/lib/trpc/react";
// import { RouterOutput } from "@verific/api";

// interface Props {
// 	project: RouterOutput["getProject"];
// }

// export function ProjectSettingsLanguageForm({ project }: Props) {
export function ProjectSettingsLanguageForm() {
	// Lógica do formulário de idioma aqui, se necessário.
	// Por ora, apenas o componente ToDo.

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
			{/* Outros cards de configuração de idioma podem ser adicionados aqui */}
		</main>
	);
}
