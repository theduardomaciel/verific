"use client";
import Image from "next/image";
import Link from "next/link";

import CertificatePlaceholder from "@/public/images/certificate-placeholder.png";

// Icons
import { ExternalLink, Mail } from "lucide-react";

// Components
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SettingsCard } from "@/components/settings/settings-card";
import { ProjectSettingsSubscriptionsForm } from "./subscriptions-form";

interface Props {
	project: any;
}

export function ProjectSettingsPreferencesForm({ project }: Props) {
	const onArchiveProject = async () => {
		try {
			toast.success("Projeto arquivado com sucesso!");
		} catch (error) {
			toast.error("Erro ao arquivar o projeto.");
			console.error("Error archiving project:", error);
		}
	};

	return (
		<div>
			<Card className="mb-6 flex flex-col items-start justify-center gap-6 p-6 md:flex-row md:items-center">
				<Image
					src={CertificatePlaceholder}
					className="max-w-1/3 flex-1 object-contain"
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

			<ProjectSettingsSubscriptionsForm project={project} />

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
					action: (
						<Button disabled onClick={onArchiveProject}>
							Arquivar
						</Button>
					),
				}}
			/>
		</div>
	);
}
