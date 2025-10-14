"use client";
import { toast } from "sonner";

// Icons
import { ImageUp } from "lucide-react";

// Components
import { SettingsFormCard } from "@/components/settings/SettingsFormCard";
import { ColorPicker } from "@/components/pickers/color-picker";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
	FormField,
	FormItem,
	FormControl,
	FormMessage,
} from "@/components/ui/form";

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
import { Input } from "@/components/ui/input";

interface Props {
	project: RouterOutput["getProject"]["project"];
}

export function ProjectSettingsSubscriptionsForm({ project }: Props) {
	const updateMutation = trpc.updateProject.useMutation();

	const onSubmitSubscriptionManagement = async (form: UseFormReturn<any>) => {
		const data = form.getValues();
		try {
			await updateMutation.mutateAsync({
				id: project.id,
				isRegistrationEnabled: data.enableSubscription,
			});
			toast.success("Configurações de inscrição atualizadas!");
			form.reset(data);
		} catch (error) {
			toast.error("Erro ao atualizar configurações de inscrição.");
			console.error("Error updating subscription management:", error);
		}
	};

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

	return (
		<div>
			{/* Manage subscription */}
			<SettingsFormCard
				schema={subscriptionManagementSchema}
				title="Gerenciar Inscrições"
				description="Decida se usuários poderão utilizar a página de inscrição para se cadastrarem ou não"
				initialState={{
					enableSubscription: project.isRegistrationEnabled,
				}}
				onSubmit={onSubmitSubscriptionManagement}
				renderField={(form) => (
					<FormField
						control={form.control}
						name="enableSubscription"
						render={({ field }) => (
							<FormItem>
								<FormControl>
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
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}
				footer={{
					text: "As mudanças podem levar alguns minutos para tomar efeito",
				}}
			/>

			<SettingsFormCard
				schema={brandingSchema}
				title="Marca do Evento"
				description="Estes elementos serão utilizados na página de inscrição para customizá-la com a marca de seu evento"
				initialState={{
					logoUrl: project.logoUrl || "",
					bannerUrl: project.coverUrl || "",
					thumbnailUrl: project.thumbnailUrl || "",
				}}
				onSubmit={onSubmitBranding}
				renderField={(form) => (
					<div className="flex flex-col gap-2">
						<FormField
							control={form.control}
							name="logoUrl"
							render={({ field }) => (
								<Input {...field} placeholder="URL da logo" />
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
		</div>
	);
}
