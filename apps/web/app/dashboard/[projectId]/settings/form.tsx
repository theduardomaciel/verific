"use client";

// Components
import { SettingsFormCard } from "@/components/settings/SettingsFormCard";
import { Input } from "@/components/ui/input";
import { PlacePicker } from "@/components/place-picker";
import { CalendarDateRangePicker } from "@/components/dashboard/overview/calendar-date-range-picker";

// Validations
import {
	addressSchema,
	dateSchema,
	nameSchema,
	urlSchema,
} from "@/lib/validations/project-settings-general-form";
import { RouterOutput } from "@verific/api";
import { updateProject } from "@/app/actions";

interface Props {
	project: RouterOutput["getProject"];
}

export function ProjectSettingsGeneral({ project }: Props) {
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
				action={updateProject}
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
				action={updateProject}
				renderField={(field) => (
					<div className="flex items-center">
						<div className="bg-muted flex h-9 items-center rounded-l-md border px-4">
							<span className="text-muted-foreground">
								verific.com/
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
				fieldName="startDate"
				title="Data do Evento"
				description="Esta é a data de duração exibida aos usuários ao se inscrever em seu evento"
				label="Data"
				initialState={{
					from: project.startDate,
					to: project.endDate,
				}}
				action={updateProject}
				renderField={(field) => (
					<CalendarDateRangePicker
						value={field.value}
						onChange={field.onChange}
					/>
				)}
				footer={{
					text: "A data inserida deve ser válida",
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
				action={updateProject}
				renderField={(field) => (
					<PlacePicker
						defaultValue={field.value}
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
