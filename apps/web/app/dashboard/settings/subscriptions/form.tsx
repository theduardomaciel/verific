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
import { RouterOutput } from "@verific/api";

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
											Habilitar Inscrições
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
		</div>
	);
}
