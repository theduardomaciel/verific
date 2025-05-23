"use client";
import { UseFormReturn } from "react-hook-form";

// Components
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { PlacePicker } from "@/components/pickers/place-picker";
import { SettingsFormCard } from "@/components/settings/SettingsFormCard";
import { DateRangePicker } from "@/components/pickers/date-range-picker";

// Validations
import {
	addressSchema,
	dateSchema,
	nameSchema,
	urlSchema,
} from "@/lib/validations/forms/settings-form/project/general-form";

// Infer types from schemas
import z from "zod";
type NameFormValues = z.infer<typeof nameSchema>;
type UrlFormValues = z.infer<typeof urlSchema>;
type DateFormValues = z.infer<typeof dateSchema>;
type AddressFormValues = z.infer<typeof addressSchema>;

// tRPC
import { trpc } from "@/lib/trpc/react";
import { RouterOutput } from "@verific/api";

interface Props {
	project: RouterOutput["getProject"]["project"];
}

export function ProjectSettingsGeneral({ project }: Props) {
	const updateMutation = trpc.updateProject.useMutation();

	// Função auxiliar para lidar com a submissão do formulário
	const handleFormSubmit = async (
		form: UseFormReturn<any>,
		successMessage: string,
		errorMessage: string,
		logContext: string,
	) => {
		const data = form.getValues();
		const { dateRange, ...rest } = data;

		try {
			await updateMutation.mutateAsync({
				id: project.id,
				...rest,
				startDate: dateRange.startDate,
				endDate: dateRange.endDate,
			});
			toast.success(successMessage);
			form.reset(data); // Resetar o formulário com os novos dados
		} catch (error) {
			toast.error(errorMessage, { duration: 2500 });
			console.error(`Error ${logContext}:`, error);
		}
	};

	const onSubmitName = async (form: UseFormReturn<NameFormValues>) => {
		await handleFormSubmit(
			form,
			"Nome do evento atualizado com sucesso!",
			"Erro ao atualizar o nome do evento. Tente novamente mais tarde.",
			"updating event name",
		);
	};

	const onSubmitUrl = async (form: UseFormReturn<UrlFormValues>) => {
		await handleFormSubmit(
			form,
			"URL do evento atualizada com sucesso!",
			"Erro ao atualizar a URL do evento. Tente novamente mais tarde.",
			"updating event url",
		);
	};

	const onSubmitDate = async (form: UseFormReturn<DateFormValues>) => {
		await handleFormSubmit(
			form,
			"Data do evento atualizada com sucesso!",
			"Erro ao atualizar a data do evento. Tente novamente mais tarde.",
			"updating event date",
		);
	};

	const onSubmitAddress = async (form: UseFormReturn<AddressFormValues>) => {
		await handleFormSubmit(
			form,
			"Endereço do evento atualizado com sucesso!",
			"Erro ao atualizar o endereço do evento. Tente novamente mais tarde.",
			"updating event address",
		);
	};

	return (
		<>
			<SettingsFormCard
				schema={nameSchema}
				fieldName="name"
				title="Nome do Evento"
				description="Este é o nome da equipe que será exibido para todos os visitantes e participantes"
				label="Nome"
				renderField={(field) => <Input {...field} autoComplete="off" />}
				initialState={project.name}
				onSubmit={onSubmitName}
				footer={{
					text: "Por favor, use 32 caracteres no máximo",
				}}
			/>
			<SettingsFormCard
				schema={urlSchema}
				fieldName="url"
				title="URL do Evento"
				description="Este é o endereço que os usuários poderão acessar para se inscrever em seu evento"
				label="URL"
				initialState={project.url}
				onSubmit={onSubmitUrl}
				renderField={(field) => (
					<div className="flex items-center">
						<div className="bg-muted flex h-9 items-center rounded-l-md border px-4">
							<span className="text-muted-foreground">
								verific.com/event/
							</span>
						</div>
						<Input
							{...field}
							className="rounded-l-none border-l-0"
							autoComplete="off"
						/>
					</div>
				)}
				footer={{
					text: "Por favor, use 36 caracteres no máximo",
				}}
			/>
			<SettingsFormCard
				schema={dateSchema}
				fieldName="dateRange"
				title="Data do Evento"
				description="Esta é a data de duração exibida aos usuários ao se inscrever em seu evento"
				label="Data"
				initialState={{
					from: project.startDate,
					to: project.endDate,
				}}
				onSubmit={onSubmitDate}
				renderField={(field) => (
					<DateRangePicker
						value={field.value} // field.value aqui será { from: Date, to: Date }
						onChange={field.onChange}
					/>
				)}
				footer={{
					text: "A data inserida deve ser maior que a data atual",
				}}
			/>
			<SettingsFormCard
				schema={addressSchema}
				fieldName="address"
				title="Endereço do Evento"
				description="Este é o local físico utilizado para hospedar seu evento. Ele será exibido aos participantes na página de inscrição."
				label="Endereço"
				initialState={{
					address: project.address,
				}}
				onSubmit={onSubmitAddress}
				renderField={(field) => (
					<PlacePicker
						defaultValue={field.value} // field.value aqui será { address: string, latitude: number, longitude: number }
						onPlaceChange={field.onChange}
					/>
				)}
				footer={{
					text: "Selecione uma localização pesquisando ou clicando no mapa.",
				}}
			/>
		</>
	);
}
