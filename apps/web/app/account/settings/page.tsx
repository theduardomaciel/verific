import { SettingsCard } from "@/components/settings/settings-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image } from "lucide-react";

export default function AccountSettings() {
	return (
		<>
			{/* Name */}
			<SettingsCard
				title="Nome"
				description="Insira o nome de sua instituição que será exibido para participantes nas páginas de inscrição de seus eventos"
				footer={{
					text: "Por favor, use 32 caracteres no máximo",
					action: <Button>Salvar</Button>,
				}}
			>
				<Input defaultValue="Liga Acadêmica de Computação da UFAL" />
			</SettingsCard>

			{/* Avatar */}
			<SettingsCard
				title="Avatar"
				description="Clique no avatar para enviar uma imagem personalizada dos seus arquivos."
				headerRight={
					<div className="w-36 h-36 flex items-center justify-center border rounded-full">
						<Image className="w-10 h-10 text-foreground opacity-30" />
					</div>
				}
				footer={{
					text: "Utilizamos a imagem de perfil de sua conta Google, por padrão",
				}}
			/>

			{/* Delete account */}
			<SettingsCard
				title="Excluir Conta"
				description={
					<>
						Remova permanentemente a conta da sua instituição e todo o seu
						conteúdo da plataforma{" "}
						<span className="font-semibold">verifIC</span>. Todos os seus{" "}
						<span className="font-semibold">20 projetos</span> e seus conteúdos
						serão excluídos em cascata. Esta ação é irreversível, portanto,
						continue com cautela.
					</>
				}
				borderColor="border-[#ef4444]"
				footer={{
					action: (
						<Button className="ml-auto" variant={"destructive"}>
							Excluir conta
						</Button>
					),
				}}
				footerClassName="bg-destructive/20 border-destructive"
			/>
		</>
	);
}
