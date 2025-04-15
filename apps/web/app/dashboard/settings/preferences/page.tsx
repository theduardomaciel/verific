"use client";

// Components
import { SettingsCard } from "@/components/settings/settings-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

export default function PreferencesSettings() {
	return (
		<>
			{/* Manage subscription */}
			<SettingsCard
				title="Gerenciar Inscrições"
				description="Decida se usuários poderão utilizar a página de inscrição para se cadastrarem ou não"
				footer={{
					text: "As mudanças podem levar alguns minutos para tomar efeito",
					action: <Button>Salvar</Button>,
				}}
			>
				<div className="flex items-center space-x-2">
					<Switch id="subscription_enabled" size={"lg"} />
					<Label htmlFor="subscription_enabled">
						Inscrição habilitada
					</Label>
				</div>
			</SettingsCard>

			{/* Enable research */}
			<SettingsCard
				title="Realizar Pesquisa"
				description="Decida se irá disponibilizar uma pesquisa opcional na página de inscrição de seu evento"
				footer={{
					text: "As mudanças podem levar alguns minutos para tomar efeito",
					action: <Button>Salvar</Button>,
				}}
			>
				<div className="flex items-center space-x-2">
					<Switch id="subscription_enabled" size={"lg"} />
					<Label htmlFor="subscription_enabled">
						Incluir pesquisa
					</Label>
				</div>
			</SettingsCard>

			{/* Archive event */}
			<SettingsCard
				title="Arquivar Evento"
				description="Arquive o evento atual, declarando-o como concluído e apto a realizar o envio de certificados. Após o arquivamento, o evento não poderá sofrer alterações. Você ainda poderá reverter o arquivamento."
				footer={{
					text: (
						<span className="flex flex-row gap-1.5">
							Saiba mais sobre o{" "}
							<Link
								className="text-primary hover:text-primary/80 underline"
								href={`/docs`}
							>
								<span className="flex flex-row items-center">
									Arquivamento de Projetos
									<ExternalLink className="ml-2 h-3 w-3" />
								</span>
							</Link>
						</span>
					),
					action: <Button>Arquivar</Button>,
				}}
			/>
		</>
	);
}
