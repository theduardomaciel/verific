"use client";
import { toast } from "sonner";

// Components
import { SettingsFormCard } from "@/components/settings/SettingsFormCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
	FormField,
	FormItem,
	FormControl,
	FormMessage,
} from "@/components/ui/form";

// Validations
import { subscriptionManagementSchema } from "@/lib/validations/forms/settings-form/project/subscriptions-form";

// tRPC
import { trpc } from "@/lib/trpc/react";
import type { RouterOutput } from "@verific/api";

// Types
import type { UseFormReturn } from "react-hook-form";

interface Props {
	project: RouterOutput["getProject"]["project"];
}

export function ProjectSettingsSubscriptionsForm({ project }: Props) {
	const utils = trpc.useUtils();
	const updateMutation = trpc.updateProject.useMutation({
		onSuccess: () => {
			utils.getProject.invalidate();
		},
	});

	const onSubmitSubscriptionManagement = async (form: UseFormReturn<any>) => {
		const data = form.getValues();
		try {
			await updateMutation.mutateAsync({
				id: project.id,
				isRegistrationEnabled: data.enableSubscription,
				profilesEnabled: data.profilesEnabled,
			});
			toast.success("Configurações de inscrição atualizadas!");
			form.reset(data);
		} catch (error) {
			toast.error("Erro ao atualizar configurações de inscrição.");
			console.error("Error updating subscription management:", error);
		}
	};

	return (
		<div>
			<SettingsFormCard
				schema={subscriptionManagementSchema}
				title="Gerenciar Inscrições"
				description="Decida se usuários poderão utilizar a página de inscrição para se cadastrarem ou não"
				initialState={{
					enableSubscription: project.isRegistrationEnabled || false,
					profilesEnabled: project.profilesEnabled || false,
				}}
				onSubmit={onSubmitSubscriptionManagement}
				renderField={(form) => (
					<div className="flex flex-col gap-6">
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
												Habilitar Inscrições
											</Label>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="profilesEnabled"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<div className="flex items-center space-x-2">
											<Switch
												id="profilesEnabled"
												checked={field.value}
												onCheckedChange={field.onChange}
												size={"lg"}
											/>
											<Label htmlFor="profilesEnabled">
												Habilitar perfis de participantes
											</Label>
										</div>
									</FormControl>
									<p className="text-muted-foreground text-sm">
										Com perfis ativos, cada inscrito ganha uma página
										pública no evento a partir das respostas ligadas
										no layout (Configurações → Perfil).
									</p>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				)}
				footer={{
					text: "As mudanças podem levar alguns minutos para tomar efeito",
				}}
			/>
		</div>
	);
}
