"use client";
import Image from "next/image";
import Link from "next/link";
import { type UseFormReturn } from "react-hook-form";

import CertificatePlaceholder from "@/public/images/certificate-placeholder.png";

// Icons
import { ExternalLink, LinkIcon, Mail } from "lucide-react";

// Components
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsCard } from "@/components/settings/settings-card";
import { SettingsFormCard } from "@/components/settings/SettingsFormCard";
import {
	FormField,
	FormItem,
	FormControl,
	FormMessage,
	FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ResearchGuideDialog } from "@/components/dialogs/research-guide-dialog";

// Validations
import { researchSchema } from "@/lib/validations/forms/settings-form/project/preferences-form";

// tRPC
import { trpc } from "@/lib/trpc/react";
import { RouterOutput } from "@verific/api";

// Utils
import { extractGoogleSheetId } from "@/lib/utils";

interface Props {
	project: RouterOutput["getProject"]["project"];
}

export function ProjectSettingsPreferencesForm({ project }: Props) {
	const updateMutation = trpc.updateProject.useMutation();

	const onSubmitResearch = async (form: UseFormReturn<any>) => {
		const data = form.getValues();
		try {
			await updateMutation.mutateAsync({
				id: project.id,
				isResearchEnabled: data.enableResearch,
				researchUrl: extractGoogleSheetId(data.researchUrl) || null,
			});
			toast.success("Preferências de pesquisa atualizadas!");
			form.reset(data);
		} catch (error: any) {
			toast.error("Erro ao atualizar preferências de pesquisa:", {
				description: error.message,
			});
			console.error("Error updating research preferences:", error);
		}
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
				schema={researchSchema}
				title="Realizar Pesquisa"
				description="Decida se irá disponibilizar uma pesquisa opcional na página de inscrição de seu evento"
				initialState={{
					enableResearch: project.isResearchEnabled,
					researchUrl: project.researchUrl || "",
				}}
				onSubmit={onSubmitResearch}
				renderField={(form) => (
					<div className="flex flex-col gap-4">
						<FormField
							control={form.control}
							name="researchUrl"
							render={({ field }) => (
								<FormItem className="flex w-full flex-col">
									<FormLabel htmlFor="researchUrl">
										Link da planilha de respostas
									</FormLabel>
									<FormControl>
										<Input
											placeholder="https://docs.google.com/spreadsheets/d/..."
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="enableResearch"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<div className="flex items-center space-x-2">
											<Switch
												onCheckedChange={field.onChange}
												checked={field.value}
												size={"lg"}
												disabled={
													!form.watch("researchUrl")
												}
											/>
											<Label htmlFor="enableResearch">
												Incluir pesquisa
											</Label>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				)}
				footer={{
					text: (
						<span className="flex flex-row gap-1.5">
							Saiba mais sobre o{" "}
							<ResearchGuideDialog>
								<span className="text-primary hover:text-primary/80 flex cursor-pointer flex-row items-center underline">
									Uso de Pesquisas
									<LinkIcon className="ml-2 h-3 w-3" />
								</span>
							</ResearchGuideDialog>
						</span>
					),
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
