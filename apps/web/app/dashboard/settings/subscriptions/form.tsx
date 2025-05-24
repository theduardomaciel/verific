"use client";
import { toast } from "sonner";

// Icons
import { ImageUp } from "lucide-react";

// Components
import { SettingsFormCard } from "@/components/settings/SettingsFormCard";
import { ColorPicker } from "@/components/pickers/color-picker";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Validations
import {
	subscriptionManagementSchema,
	brandingSchema,
	colorSchema,
} from "@/lib/validations/forms/settings-form/project/subscriptions-form";

// tRPC
import { trpc } from "@/lib/trpc/react";
import { RouterOutput } from "@verific/api";

// Types
import type { UseFormReturn } from "react-hook-form";

interface Props {
	project: RouterOutput["getProject"]["project"];
}

export function ProjectSettingsSubscriptionsForm({ project }: Props) {
	const updateMutation = trpc.updateProject.useMutation();

	const handleFormSubmit = async (
		form: UseFormReturn<any>,
		successMessage: string,
		errorMessage: string,
		logMessage: string,
	) => {
		const data = form.getValues();
		const { colors, ...rest } = data;

		try {
			await updateMutation.mutateAsync({
				id: project.id,
				...colors,
				...rest,
			});
			toast.success(successMessage);
			form.reset(data);
		} catch (error) {
			toast.error(errorMessage);
			console.error(logMessage, error);
		}
	};

	const onSubmitSubscriptionManagement = async (form: UseFormReturn<any>) => {
		await handleFormSubmit(
			form,
			"Configurações de inscrição atualizadas!",
			"Erro ao atualizar configurações de inscrição.",
			"Error updating subscription management:",
		);
	};

	const onSubmitBranding = async (form: UseFormReturn<any>) => {
		await handleFormSubmit(
			form,
			"Configurações de marca atualizadas!",
			"Erro ao atualizar configurações de marca.",
			"Error updating branding:",
		);
	};

	const onSubmitColors = async (form: UseFormReturn<any>) => {
		console.log("form", form.getValues());
		await handleFormSubmit(
			form,
			"Cores do evento atualizadas!",
			"Erro ao atualizar cores do evento.",
			"Error updating colors:",
		);
	};

	return (
		<div>
			{/* Manage subscription */}
			<SettingsFormCard
				schema={subscriptionManagementSchema}
				fieldName="enableSubscription"
				title="Gerenciar Inscrições"
				description="Decida se usuários poderão utilizar a página de inscrição para se cadastrarem ou não"
				label="Inscrição habilitada"
				initialState={project.hasRegistration}
				onSubmit={onSubmitSubscriptionManagement}
				renderField={(field) => (
					<div className="flex items-center space-x-2">
						<Switch
							id="enableSubscription"
							checked={field.value}
							onCheckedChange={field.onChange}
							size={"lg"}
						/>
						<Label htmlFor="enableSubscription">
							Inscrição habilitada
						</Label>
					</div>
				)}
				footer={{
					text: "As mudanças podem levar alguns minutos para tomar efeito",
				}}
			/>

			{/* Branding */}
			<SettingsFormCard
				schema={brandingSchema} // Pode precisar de múltiplos fieldNames ou um fieldName de objeto
				fieldName="branding" // Exemplo, ajuste conforme a estrutura do schema e do formulário
				title="Marca do Evento"
				description="Estes elementos serão utilizados na página de inscrição para customizá-la com a marca de seu evento"
				initialState={{
					thumbnailUrl: project.thumbnailUrl || "",
					coverUrl: project.coverUrl || "",
				}}
				onSubmit={onSubmitBranding}
				renderField={(
					field, // Este renderField precisará ser ajustado para lidar com uploads/inputs de URL
				) => (
					<div className="flex flex-row items-center gap-6">
						<div className="bg-input flex h-24 w-24 min-w-24 cursor-pointer items-center justify-center rounded-full md:h-32 md:w-32">
							{/* Input para thumbnailUrl - field.value.thumbnailUrl, field.onChange(...) */}
							<ImageUp className="text-muted-foreground h-8 w-8" />
						</div>
						<div className="bg-input flex h-24 w-96 cursor-pointer items-center justify-center rounded md:h-32">
							{/* Input para coverUrl - field.value.coverUrl, field.onChange(...) */}
							<ImageUp className="text-muted-foreground h-8 w-8" />
						</div>
					</div>
				)}
				footer={{
					text: "Para inserir uma imagem, clique no elemento correspondente",
				}}
			/>

			{/* Colors */}
			<SettingsFormCard
				schema={colorSchema} // Pode precisar de múltiplos fieldNames ou um fieldName de objeto
				fieldName="colors" // Exemplo, ajuste conforme a estrutura do schema e do formulário
				title="Cores"
				description="Escolha uma principal e uma cor secundária para uso na página de inscrição"
				initialState={{
					primaryColor: project.primaryColor,
					secondaryColor: project.secondaryColor,
				}}
				onSubmit={onSubmitColors}
				renderField={(
					field, // Este renderField precisará ser ajustado para lidar com dois color pickers
				) => (
					<div className="flex flex-row flex-wrap items-center justify-start gap-6">
						<div className="flex flex-row items-center justify-start gap-4">
							<span className="text-muted-foreground text-sm font-normal">
								Cor principal
							</span>
							<ColorPicker
								color={field.value.primaryColor}
								onChange={(color) =>
									field.onChange({
										...field.value,
										primaryColor: color,
									})
								}
							/>
						</div>
						<div className="flex flex-row items-center justify-start gap-4">
							<span className="text-muted-foreground text-sm font-normal">
								Cor secundária
							</span>
							<ColorPicker
								color={field.value.secondaryColor}
								onChange={(color) => {
									field.onChange({
										...field.value,
										secondaryColor: color,
									});
								}}
							/>
						</div>
					</div>
				)}
				footer={{
					text: "As mudanças podem levar alguns minutos para tomar efeito",
				}}
			/>
		</div>
	);
}
