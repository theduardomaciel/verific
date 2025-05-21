import { Fragment } from "react";

// Components
import { PlacePicker } from "@/components/place-picker";
import { ProjectDeletePreview } from "@/components/settings/project-delete-preview";
import { SettingsCard } from "@/components/settings/settings-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ProjectSettings() {
	return (
		<div>
			{/* Name */}
			<SettingsCard
				title="Nome do Evento"
				description="Este é o nome da equipe que será exibido para todos os visitantes e participantes"
				footer={{
					text: "Por favor, use 32 caracteres no máximo",
					action: <Button>Salvar</Button>,
				}}
			>
				<Input defaultValue="SECOMP 2025" />
			</SettingsCard>

			{/* Description */}
			<SettingsCard
				title="Descrição do Evento"
				description="Esta breve descrição será exibida para todos os visitantes e participantes"
				footer={{
					text: "Por favor, use 3000 caracteres no máximo",
					action: <Button>Salvar</Button>,
				}}
			>
				<Textarea
					defaultValue="Insira sua descrição aqui"
					className="min-h-24"
				/>
			</SettingsCard>

			{/* URL */}
			<SettingsCard
				title="URL do Evento"
				description="Este é o endereço que os usuários poderão acessar para se inscrever em seu evento"
				footer={{
					text: "Por favor, use 36 caracteres no máximo ",
					action: <Button>Salvar</Button>,
				}}
			>
				<div className="flex items-center">
					<div className="bg-muted flex h-9 items-center rounded-l-md border px-4">
						<span className="text-muted-foreground">
							verific.com/
						</span>
					</div>
					<Input
						defaultValue="secomp2025"
						className="rounded-l-none border-l-0"
					/>
				</div>
			</SettingsCard>

			{/* Address */}
			<SettingsCard
				title="Endereço do Evento"
				description="Este é o local físico utilizado para hospedar seu evento. Ele será exibido aos participantes na página de inscrição."
				footer={{
					text: "Selecione uma localização pesquisando ou clicando no mapa.",
					action: <Button>Salvar</Button>,
				}}
			>
				<PlacePicker
					defaultValue={{
						latitude: -23.5505,
						longitude: -46.6333,
						address: "Praça da Sé, São Paulo, SP",
					}}
				/>
			</SettingsCard>

			{/* Delete */}
			{/* <SettingsCard
				title="Excluir Evento"
				description={
					<>
						O evento será excluído permanentemente, incluindo sua
						página de inscrição e participantes. Esta ação é
						irreversível e não pode ser desfeita. Os usuários
						cadastrados receberão um e-mail informando o ocorrido.
						<ProjectDeletePreview />
					</>
				}
				borderColor="border-destructive"
				footer={{
					action: (
						<Button className="ml-auto" variant={"destructive"}>
							Excluir
						</Button>
					),
				}}
				footerClassName="bg-destructive/20 border-destructive"
			/> */}
		</div>
	);
}
