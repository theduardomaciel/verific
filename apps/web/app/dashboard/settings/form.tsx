"use client";
import { UseFormReturn } from "react-hook-form";

// Components
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlacePicker } from "@/components/pickers/place-picker";
import { SettingsFormCard } from "@/components/settings/SettingsFormCard";
import { DateRangePicker } from "@/components/pickers/date-range-picker";
import {
	FormField,
	FormItem,
	FormControl,
	FormMessage,
} from "@/components/ui/form";

// Validations
import {
	addressSchema,
	dateSchema,
	eventDescriptionSchema,
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

	const onSubmitName = async (form: UseFormReturn<NameFormValues>) => {
		const data = form.getValues();
		try {
			await updateMutation.mutateAsync({
				id: project.id,
				name: data.name,
			});
			toast.success("Nome do evento atualizado com sucesso!");
			form.reset(data);
		} catch (error) {
			toast.error(
				"Erro ao atualizar o nome do evento. Tente novamente mais tarde.",
			);
			console.error("updating event name", error);
		}
	};

	const onSubmitEventDescription = async (form: UseFormReturn<any>) => {
		const data = form.getValues();
		try {
			await updateMutation.mutateAsync({
				id: project.id,
				description: data.description,
			});
			toast.success("Descrição do evento atualizada!");
			form.reset(data);
		} catch (error) {
			toast.error("Erro ao atualizar descrição do evento.");
			console.error("Error updating event description:", error);
		}
	};

	const onSubmitUrl = async (form: UseFormReturn<UrlFormValues>) => {
		const data = form.getValues();
		try {
			await updateMutation.mutateAsync({
				id: project.id,
				url: data.url,
			});
			toast.success("URL do evento atualizada com sucesso!");
			form.reset(data);
		} catch (error) {
			toast.error(
				"Erro ao atualizar a URL do evento. Tente novamente mais tarde.",
			);
			console.error("updating event url", error);
		}
	};

	const onSubmitDate = async (form: UseFormReturn<DateFormValues>) => {
		const data = form.getValues();
		try {
			await updateMutation.mutateAsync({
				id: project.id,
				startDate: data.startDate,
				endDate: data.endDate,
			});
			toast.success("Data do evento atualizada com sucesso!");
			form.reset(data);
		} catch (error) {
			toast.error(
				"Erro ao atualizar a data do evento. Tente novamente mais tarde.",
			);
			console.error("updating event date", error);
		}
	};

	const onSubmitAddress = async (form: UseFormReturn<AddressFormValues>) => {
		const data = form.getValues();
		try {
			await updateMutation.mutateAsync({
				id: project.id,
				address: data.address,
				latitude: data.latitude,
				longitude: data.longitude,
			});
			toast.success("Endereço do evento atualizado com sucesso!");
			form.reset(data);
		} catch (error) {
			toast.error(
				"Erro ao atualizar o endereço do evento. Tente novamente mais tarde.",
			);
			console.error("updating event address", error);
		}
	};

	return (
		<>
			<SettingsFormCard
				schema={nameSchema}
				title="Nome do Evento"
				description="Este é o nome da equipe que será exibido para todos os visitantes e participantes"
				initialState={{ name: project.name }}
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
			<SettingsFormCard
				schema={eventDescriptionSchema}
				title="Descrição do Evento"
				description="Esta breve descrição será exibida para todos os visitantes e participantes"
				initialState={{ description: project.description }}
				onSubmit={onSubmitEventDescription}
				renderField={(form) => (
					<FormField
						control={form.control}
						name="description"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Textarea {...field} className="min-h-24" />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}
				footer={{
					text: "Por favor, use 512 caracteres no máximo",
				}}
			/>
			<SettingsFormCard
				schema={urlSchema}
				title="URL do Evento"
				description="Este é o endereço que os usuários poderão acessar para se inscrever em seu evento"
				initialState={{ url: project.url }}
				onSubmit={onSubmitUrl}
				renderField={(form) => (
					<FormField
						control={form.control}
						name="url"
						render={({ field }) => (
							<FormItem>
								<FormControl>
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
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}
				footer={{
					text: "Por favor, use 36 caracteres no máximo",
				}}
			/>
			<SettingsFormCard
				schema={dateSchema}
				title="Data do Evento"
				description="Esta é a data de duração exibida aos usuários ao se inscrever em seu evento"
				initialState={{
					startDate: project.startDate,
					endDate: project.endDate,
				}}
				onSubmit={onSubmitDate}
				renderField={(form) => (
					<DateRangePicker
						value={{
							from: form.watch("startDate"),
							to: form.watch("endDate"),
						}}
						onChange={(value) => {
							if (value?.from)
								form.setValue("startDate", value.from);
							if (value?.to) form.setValue("endDate", value.to);
						}}
					/>
				)}
				footer={{
					text: "A data inserida deve ser maior que a data atual",
				}}
			/>
			<SettingsFormCard
				schema={addressSchema}
				title="Endereço do Evento"
				description="Este é o local físico utilizado para hospedar seu evento. Ele será exibido aos participantes na página de inscrição."
				initialState={{
					address: project.address,
					latitude: project.latitude,
					longitude: project.longitude,
				}}
				onSubmit={onSubmitAddress}
				renderField={(form) => (
					<PlacePicker
						defaultValue={{
							address: form.watch("address"),
							latitude: form.watch("latitude"),
							longitude: form.watch("longitude"),
						}}
						onPlaceChange={(value) => {
							form.setValue("address", value.address);
							form.setValue("latitude", value.latitude);
							form.setValue("longitude", value.longitude);
						}}
					/>
				)}
				footer={{
					text: "Selecione uma localização pesquisando ou clicando no mapa",
				}}
			/>
		</>
	);
}
