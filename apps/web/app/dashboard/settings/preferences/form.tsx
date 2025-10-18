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
import { SettingsCard } from "@/components/settings/settings-card";
import { SettingsFormCard } from "@/components/settings/SettingsFormCard";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/pickers/color-picker";

// Validations
import {
	brandingSchema,
	colorSchema,
} from "@/lib/validations/forms/settings-form/project/preferences-form";

// tRPC
import { trpc } from "@/lib/trpc/react";
import { RouterOutput } from "@verific/api";

interface Props {
	project: RouterOutput["getProject"]["project"];
}

export function ProjectSettingsPreferencesForm({ project }: Props) {
	const updateMutation = trpc.updateProject.useMutation();

	const onSubmitBranding = async (form: UseFormReturn<any>) => {
		const data = form.getValues();
		try {
			await updateMutation.mutateAsync({
				id: project.id,
				logoUrl: data.logoUrl,
				coverUrl: data.bannerUrl,
			});
			toast.success("Configurações de marca atualizadas!");
			form.reset(data);
		} catch (error) {
			toast.error("Erro ao atualizar configurações de marca.");
			console.error("Error updating branding:", error);
		}
	};

	const onSubmitColors = async (form: UseFormReturn<any>) => {
		const data = form.getValues();
		try {
			await updateMutation.mutateAsync({
				id: project.id,
				primaryColor: data.primaryColor,
				secondaryColor: data.secondaryColor,
			});
			toast.success("Cores do evento atualizadas!");
			form.reset(data);
		} catch (error) {
			toast.error("Erro ao atualizar cores do evento.");
			console.error("Error updating colors:", error);
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

			<SettingsFormCard
				schema={brandingSchema}
				title="Marca do Evento"
				description="Estes elementos serão utilizados na página de inscrição para customizá-la com a marca de seu evento"
				initialState={{
					logoUrl: project.logoUrl || "",
					largeLogoUrl: project.largeLogoUrl || "",
					bannerUrl: project.coverUrl || "",
					thumbnailUrl: project.thumbnailUrl || "",
				}}
				onSubmit={onSubmitBranding}
				renderField={(form) => (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<FormField
							control={form.control}
							name="logoUrl"
							render={({ field }) => (
								<Input {...field} placeholder="URL da logo" />
							)}
						/>
						<FormField
							control={form.control}
							name="largeLogoUrl"
							render={({ field }) => (
								<Input
									{...field}
									placeholder="URL da logo horizontal"
								/>
							)}
						/>
						<FormField
							control={form.control}
							name="bannerUrl"
							render={({ field }) => (
								<Input {...field} placeholder="URL da capa" />
							)}
						/>
						<FormField
							control={form.control}
							name="thumbnailUrl"
							render={({ field }) => (
								<Input
									{...field}
									placeholder="URL da miniatura"
								/>
							)}
						/>
					</div>
				)}
				footer={{
					text: "Para inserir uma imagem, clique no elemento correspondente",
				}}
			/>

			{/* Colors */}
			<SettingsFormCard
				schema={colorSchema}
				title="Cores"
				description="Escolha uma principal e uma cor secundária para uso na página de inscrição"
				initialState={{
					primaryColor: project.primaryColor,
					secondaryColor: project.secondaryColor,
				}}
				onSubmit={onSubmitColors}
				renderField={(form) => (
					<div className="flex flex-row flex-wrap items-center justify-start gap-6">
						<div className="flex flex-row items-center justify-start gap-4">
							<span className="text-muted-foreground text-sm font-normal">
								Cor principal
							</span>
							<FormField
								control={form.control}
								name="primaryColor"
								render={({ field }) => (
									<ColorPicker
										color={field.value}
										onChange={field.onChange}
									/>
								)}
							/>
						</div>
						<div className="flex flex-row items-center justify-start gap-4">
							<span className="text-muted-foreground text-sm font-normal">
								Cor secundária
							</span>
							<FormField
								control={form.control}
								name="secondaryColor"
								render={({ field }) => (
									<ColorPicker
										color={field.value}
										onChange={field.onChange}
									/>
								)}
							/>
						</div>
					</div>
				)}
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
