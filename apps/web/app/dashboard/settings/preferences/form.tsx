"use client";
import Image from "next/image";
import Link from "next/link";
import { type UseFormReturn } from "react-hook-form";

import CertificatePlaceholder from "@/public/images/certificate-placeholder.png";

// Icons
import { ExternalLink, Mail } from "lucide-react";

// Components
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsCard } from "@/components/settings/settings-card";
import { SettingsFormCard } from "@/components/settings/SettingsFormCard";

// Validations
import { researchSchema } from "@/lib/validations/forms/settings-form/project/preferences-form";

// tRPC
import { trpc } from "@/lib/trpc/react";
import { RouterOutput } from "@verific/api";

interface Props {
	project: RouterOutput["getProject"]["project"];
}

export function ProjectSettingsPreferencesForm({ project }: Props) {
	const updateMutation = trpc.updateProject.useMutation();

	const handleFormSubmit = async (
		form: UseFormReturn<any>,
		successMessage: string,
		errorMessage: string,
		logMessage: string,
	) => {
		const data = form.getValues();
		try {
			await updateMutation.mutateAsync({
				id: project.id,
				...data,
			});
			toast.success(successMessage);
			form.reset(data);
		} catch (error) {
			toast.error(errorMessage);
			console.error(logMessage, error);
		}
	};

	const onSubmitResearch = async (form: UseFormReturn<any>) => {
		await handleFormSubmit(
			form,
			"Preferências de pesquisa atualizadas!",
			"Erro ao atualizar preferências de pesquisa.",
			"Error updating research preferences:",
		);
	};

	const onArchiveProject = async () => {
		// Lógica para arquivar projeto
		try {
			// Chamar a mutação/api apropriada para arquivar
			// await archiveMutation.mutateAsync({ id: project.id });
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

			{/* Enable research */}
			<SettingsFormCard
				schema={researchSchema} // Usar o schema criado
				fieldName="enableResearch" // Nome do campo no schema
				title="Realizar Pesquisa"
				description="Decida se irá disponibilizar uma pesquisa opcional na página de inscrição de seu evento"
				label="Incluir pesquisa"
				renderField={(field) => (
					<div className="flex items-center space-x-2">
						<Switch
							id="enableResearch"
							checked={field.value}
							onCheckedChange={field.onChange}
							size={"lg"}
						/>
						<Label htmlFor="enableResearch">Incluir pesquisa</Label>
					</div>
				)}
				initialState={project.hasResearch}
				onSubmit={onSubmitResearch}
				footer={{
					text: "As mudanças podem levar alguns minutos para tomar efeito",
				}}
			/>

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
