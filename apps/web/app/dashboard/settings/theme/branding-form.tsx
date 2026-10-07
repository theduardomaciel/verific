"use client";
import { type UseFormReturn } from "react-hook-form";

// Components
import { toast } from "sonner";
import { SettingsFormCard } from "@/components/settings/SettingsFormCard";
import { FormField } from "@/components/ui/form";
import { ImageUploader } from "@/components/ui/image-uploader";

// Validations
import { brandingSchema } from "@/lib/validations/forms/settings-form/project/preferences-form";

// tRPC
import { trpc } from "@/lib/trpc/react";
import type { RouterOutput } from "@verific/api";

interface Props {
	project: RouterOutput["getProject"]["project"];
}

export function ProjectBrandingForm({ project }: Props) {
	const utils = trpc.useUtils();
	const updateMutation = trpc.updateProject.useMutation({
		onSuccess: () => {
			void utils.getProject.invalidate();
		},
	});

	const onSubmitBranding = async (form: UseFormReturn<any>) => {
		const data = form.getValues();
		try {
			await updateMutation.mutateAsync({
				id: project.id,
				logoUrl: data.logoUrl,
				largeLogoUrl: data.largeLogoUrl,
				coverUrl: data.bannerUrl,
				logoDarkUrl: data.logoDarkUrl,
				largeLogoDarkUrl: data.largeLogoDarkUrl,
				thumbnailUrl: data.thumbnailUrl,
			});
			toast.success("Configurações de marca atualizadas!");
			form.reset(data);
		} catch (error) {
			toast.error("Erro ao atualizar configurações de marca.");
			console.error("Error updating branding:", error);
		}
	};

	return (
		<SettingsFormCard
			schema={brandingSchema}
			title="Marca do Evento"
			description="Estes elementos serão utilizados na página de inscrição para customizá-la com a marca de seu evento"
			initialState={{
				logoUrl: project.logoUrl || "",
				largeLogoUrl: project.largeLogoUrl || "",
				bannerUrl: project.coverUrl || "",
				logoDarkUrl: project.logoDarkUrl || "",
				largeLogoDarkUrl: project.largeLogoDarkUrl || "",
				thumbnailUrl: project.thumbnailUrl || "",
			}}
			onSubmit={onSubmitBranding}
			renderField={(form) => (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormField
						control={form.control}
						name="logoUrl"
						render={({ field }) => (
							<ImageUploader
								label="Logo quadrada"
								hint="PNG/JPG/WebP/SVG até 512px"
								aspect="aspect-square max-h-48"
								purpose="event-logo"
								projectId={project.id}
								value={field.value}
								onChange={(url) => field.onChange(url)}
							/>
						)}
					/>
					<FormField
						control={form.control}
						name="largeLogoUrl"
						render={({ field }) => (
							<ImageUploader
								label="Logo horizontal"
								hint="PNG/JPG/WebP/SVG até 1024px"
								purpose="event-logo-wide"
								projectId={project.id}
								value={field.value}
								onChange={(url) => field.onChange(url)}
							/>
						)}
					/>
					<FormField
						control={form.control}
						name="bannerUrl"
						render={({ field }) => (
							<ImageUploader
								label="Capa do evento"
								hint="Fundo do hero, até 1920px"
								purpose="event-cover"
								projectId={project.id}
								value={field.value}
								onChange={(url) => field.onChange(url)}
							/>
						)}
					/>
					<FormField
						control={form.control}
						name="logoDarkUrl"
						render={({ field }) => (
							<ImageUploader
								label="Logo quadrada (modo escuro)"
								hint="Opcional; se vazia, usa o logo padrão"
								aspect="aspect-square max-h-48"
								purpose="event-logo"
								projectId={project.id}
								value={field.value}
								onChange={(url) => field.onChange(url)}
							/>
						)}
					/>
					<FormField
						control={form.control}
						name="largeLogoDarkUrl"
						render={({ field }) => (
							<ImageUploader
								label="Logo horizontal (modo escuro)"
								hint="Opcional; se vazio, usa o logo horizontal padrão"
								purpose="event-logo-wide"
								projectId={project.id}
								value={field.value}
								onChange={(url) => field.onChange(url)}
							/>
						)}
					/>
					<FormField
						control={form.control}
						name="thumbnailUrl"
						render={({ field }) => (
							<ImageUploader
								label="Miniatura"
								hint="Cartões e prévia social, até 1200px"
								purpose="event-thumbnail"
								projectId={project.id}
								value={field.value}
								onChange={(url) => field.onChange(url)}
							/>
						)}
					/>
				</div>
			)}
			footer={{
				text: "As imagens são otimizadas e enviadas direto ao armazenamento",
			}}
		/>
	);
}
