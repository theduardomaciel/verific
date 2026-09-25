"use client";
import { Image } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsCard } from "@/components/settings/settings-card";
import { SettingsFormCard } from "@/components/settings/SettingsFormCard";
import {
	FormField,
	FormItem,
	FormControl,
	FormMessage,
} from "@/components/ui/form";

// API
import { RouterOutput } from "@verific/api";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";

// Validations
import { nameSchema } from "@/lib/validations/forms/settings-form/project/general-form";
import { z } from "@verific/zod";
type NameFormValues = z.infer<typeof nameSchema>;

interface Props {
	user: RouterOutput["getUser"];
}

export function AccountSettingsGeneral({ user }: Props) {
	const updateMutation = trpc.updateUser.useMutation();

	const onSubmitName = async (form: any) => {
		const data = form.getValues();
		try {
			/* await updateMutation.mutateAsync({
				name: data.name,
				course: data.course,
				projectId: data.projectId,
				registrationId: data.registrationId,
				period: data.period,
			}); */
			toast.success("Nome atualizado com sucesso!");
			form.reset(data);
		} catch (error) {
			toast.error(
				"Erro ao atualizar o nome. Tente novamente mais tarde.",
			);
			console.error("Erro ao atualizar nome:", error);
		}
	};

	return (
		<>
			{/* Name */}
			<SettingsFormCard
				schema={nameSchema}
				title="Nome"
				description="Insira o nome de sua instituição que será exibido para participantes nas páginas de inscrição de seus eventos"
				initialState={{ name: user.name }}
				onSubmit={onSubmitName}
				renderField={(form) => (
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Input {...field} autoComplete="off" />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}
				footer={{
					text: "Por favor, use 32 caracteres no máximo",
				}}
			/>

			{/* Avatar */}
			<SettingsCard
				title="Avatar"
				description="Clique no avatar para enviar uma imagem personalizada dos seus arquivos."
				headerRight={
					<div className="flex h-28 w-28 items-center justify-center rounded-full border">
						{user.image_url ? (
							<img
								src={user.image_url}
								alt="Avatar"
								className="h-28 w-28 rounded-full object-cover"
							/>
						) : (
							<Image className="text-foreground h-8 w-8 opacity-30" />
						)}
					</div>
				}
				footer={{
					text: "Utilizamos a imagem de perfil de sua conta Google, por padrão",
				}}
			/>

			{/* Delete user */}
			<SettingsCard
				title="Excluir Conta"
				description={
					<>
						Remova permanentemente a conta da sua instituição e todo
						o seu conteúdo da plataforma{" "}
						<span className="font-semibold">verifIC</span>. Todos os
						seus <span className="font-semibold">X projetos</span> e
						seus conteúdos serão excluídos em cascata. Esta ação é
						irreversível, portanto, continue com cautela.
					</>
				}
				borderColor="border-[#ef4444]"
				footer={{
					action: (
						<Button className="ml-auto" variant={"destructive"}>
							Excluir conta
						</Button>
					),
				}}
				footerClassName="bg-destructive/20 border-destructive"
			/>
		</>
	);
}
