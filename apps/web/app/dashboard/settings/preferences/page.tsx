"use client";
import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";

import { ExternalLink, Mail } from "lucide-react";
import CertificatePlaceholder from "@/public/screenshots/certificate-placeholder.png";

// Components
import { SettingsCard } from "@/components/settings/settings-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function PreferencesSettings() {
	return (
		<div>
			<Card className="mb-6 flex flex-col items-start justify-center gap-6 p-6 md:flex-row md:items-center">
				<Image
					src={CertificatePlaceholder}
					className="flex-1 object-contain"
					alt="Certificado de exemplo"
				/>
				<div className="flex flex-1 flex-col items-center justify-start gap-4">
					<p className="text-foreground text-center text-xl font-semibold md:max-w-[70%]">
						Enviar certificação aos participantes
					</p>
					<Button className="max-md:w-full" size={"lg"} disabled>
						<Mail className="mr-2 h-4 w-4" />
						Enviar certificados
					</Button>
					{/* TODO: Inserir um <Panel /> aqui */}
				</div>
			</Card>

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
		</div>
	);
}
