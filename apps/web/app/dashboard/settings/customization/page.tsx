"use client";

import ColorPicker from "@/components/color-picker";
// Components
import { SettingsCard } from "@/components/settings/settings-card";
import { Button } from "@/components/ui/button";
import { ImageUp } from "lucide-react";
import { Fragment } from "react";

export default function CustomizationSettings() {
	return (
		<div>
			<SettingsCard
				title="Marca do Evento"
				description="Estes elementos serão utilizados na página de inscrição para customizá-la com a marca de seu evento"
				footer={{
					text: "Para inserir uma imagem, clique no elemento correspondente",
					action: <Button>Salvar</Button>,
				}}
			>
				<div className="flex flex-row items-center gap-6">
					<div className="bg-input flex h-24 w-24 min-w-24 cursor-pointer items-center justify-center rounded-full md:h-32 md:w-32">
						<ImageUp className="text-muted-foreground h-8 w-8" />
					</div>
					<div className="bg-input flex h-24 w-96 cursor-pointer items-center justify-center rounded md:h-32">
						<ImageUp className="text-muted-foreground h-8 w-8" />
					</div>
				</div>
			</SettingsCard>
			<SettingsCard
				title="Cores"
				description="Escolha uma principal e uma cor secundária para uso na página de inscrição"
				footer={{
					text: "As mudanças podem levar alguns minutos para tomar efeito",
					action: <Button>Salvar</Button>,
				}}
			>
				<div className="flex flex-row flex-wrap items-center justify-start gap-6">
					<div className="flex flex-row items-center justify-start gap-4">
						<span className="text-muted-foreground text-sm font-normal">
							Cor principal
						</span>
						<ColorPicker />
					</div>
					<div className="flex flex-row items-center justify-start gap-4">
						<span className="text-muted-foreground text-sm font-normal">
							Cor secundária
						</span>
						<ColorPicker />
					</div>
				</div>
			</SettingsCard>
		</div>
	);
}
