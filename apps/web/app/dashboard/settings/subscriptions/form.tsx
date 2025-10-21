"use client";
import { toast } from "sonner";

// Icons
import { LinkIcon } from "lucide-react";

// Components
import { SettingsFormCard } from "@/components/settings/SettingsFormCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
	FormField,
	FormItem,
	FormControl,
	FormMessage,
	FormLabel,
} from "@/components/ui/form";
import { ResearchGuideDialog } from "@/components/dialogs/research-guide-dialog";
import { Input } from "@/components/ui/input";

// Validations
import {
	researchSchema,
	subscriptionManagementSchema,
} from "@/lib/validations/forms/settings-form/project/subscriptions-form";

// tRPC
import { trpc } from "@/lib/trpc/react";
import { RouterOutput } from "@verific/api";

// Utils
import { extractGoogleSheetId } from "@/lib/utils";

// Types
import type { UseFormReturn } from "react-hook-form";

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

	return (
		<div>
			{/* Manage subscription */}
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

			{/* Enable research */}
			<SettingsFormCard
				schema={researchSchema}
				title="Realizar Pesquisa"
				description="Decida se irá disponibilizar uma pesquisa opcional na página de inscrição de seu evento"
				initialState={{
					enableResearch: project.isResearchEnabled || false,
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
		</div>
	);
}
