"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useForm, type UseFormReturn } from "react-hook-form";

import { DEFAULT_TIME_ZONE, dayKey, zonedInstant } from "@verific/drizzle/time";
import { z } from "@verific/zod";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerScrollArea,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { EventPeriodPicker } from "@/components/pickers/event-period-picker";
import { PlacePicker } from "@/components/pickers/place-picker";

import { revalidateProjects, updateProjectCookies } from "@/app/actions";
import { useMediaQuery } from "@/hooks/use-media-query";
import { trpc } from "@/lib/trpc/react";

import { ErrorDialog, LoadingDialog } from "../forms/dialogs";

import type { FormState } from "@/lib/types/forms";

// Ainda não há fuso por evento: todo evento novo usa o padrão
const NEW_EVENT_TIME_ZONE = DEFAULT_TIME_ZONE;

const formSchema = z.object({
	name: z.string().min(2, {
		message: "Nome deve conter pelo menos 2 caracteres.",
	}),
	description: z.string().max(3000, {
		message: "Descrições devem ter no máximo 3000 caracteres.",
	}),
	date: z
		.object({
			from: z.date({ error: "Selecione a data inicial." }),
			to: z.date({ error: "Selecione a data final." }),
		})
		.refine((date) => date.to > date.from, {
			message: "O fim deve ser depois do início.",
		}),
	location: z.object({
		address: z.string().min(1, {
			message: "Por favor, selecione um endereço.",
		}),
		latitude: z.number(),
		longitude: z.number(),
	}),
});

export function CreateProjectDialog() {
	const [currentState, setCurrentState] = useState<FormState>(false);
	const [open, setOpen] = useState(false);
	const isDesktop = useMediaQuery("(min-width: 768px)");

	// Inicializamos o formulário com o Zod e o React Hook Form
	// Hoje inteiro, fixado na montagem (inicializador executa uma única vez).
	const [defaultDates] = useState(() => {
		const today = dayKey(new Date(), NEW_EVENT_TIME_ZONE);
		return {
			from: zonedInstant(today, "00:00", NEW_EVENT_TIME_ZONE),
			to: zonedInstant(today, "23:59", NEW_EVENT_TIME_ZONE),
		};
	});
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			description: "",
			date: defaultDates,
			location: {
				address: "",
				latitude: 0,
				longitude: 0,
			},
		},
	});

	const createMutation = trpc.createProject.useMutation();

	// Gerenciamos o envio do formulário
	async function onSubmit(data: z.infer<typeof formSchema>) {
		setCurrentState("submitting");

		const { date, location, ...rest } = data;

		let created;
		try {
			created = await createMutation.mutateAsync({
				startDate: date.from,
				endDate: date.to,
				address: location.address,
				latitude: location.latitude,
				longitude: location.longitude,
				...rest,
			});
		} catch (error) {
			console.error(error);
			setCurrentState("error");
			return;
		}

		// O evento já existe: uma falha aqui não pode sugerir criar de novo
		await revalidateProjects(created.url).catch(console.error);
		// Grava o evento no cookie e vai para o dashboard
		void updateProjectCookies(created.id);
	}

	if (isDesktop) {
		return (
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button
						className="bg-primary flex w-full items-center justify-center gap-2 py-5 leading-none"
						size={"lg"}
					>
						<Plus className="mt-0.5" />
						Criar novo projeto
					</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-md">
					<Form {...form}>
						<form
							onSubmit={(e) =>
								void form.handleSubmit(onSubmit, (error) => {
									console.log(error);
									console.log(form.getValues());
								})(e)
							}
							className="flex w-full flex-col space-y-6"
						>
							<DialogHeader>
								<DialogTitle>Criar projeto</DialogTitle>
							</DialogHeader>
							<CreateProjectForm form={form} />
							<DialogFooter className="w-full grid-cols-2 gap-3 md:grid">
								<DialogClose asChild>
									<Button type="button" variant={"outline"}>
										Cancelar
									</Button>
								</DialogClose>
								<Button type="submit">Criar</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
				<StatusDialogs
					currentState={currentState}
					setCurrentState={setCurrentState}
				/>
			</Dialog>
		);
	}

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<DrawerTrigger asChild>
				<Button
					className="bg-primary flex w-full items-center justify-center gap-2 py-6 leading-none"
					size={"lg"}
				>
					<Plus className="mt-0.5" />
					Criar novo projeto
				</Button>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader className="text-left">
					<DrawerTitle>Criar projeto</DrawerTitle>
				</DrawerHeader>

				<Form {...form}>
					<form
						onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
						className="flex min-h-0 w-full flex-1 flex-col"
					>
						<DrawerScrollArea className="space-y-4 px-4">
							<CreateProjectForm form={form} />
						</DrawerScrollArea>

						<DrawerFooter className="flex w-full gap-2">
							<Button>Criar</Button>
							<DrawerClose asChild>
								<Button variant="outline">Cancelar</Button>
							</DrawerClose>
						</DrawerFooter>
					</form>
				</Form>
			</DrawerContent>
			<StatusDialogs
				currentState={currentState}
				setCurrentState={setCurrentState}
			/>
		</Drawer>
	);
}

function StatusDialogs({
	currentState,
	setCurrentState,
}: {
	currentState: FormState;
	setCurrentState: React.Dispatch<React.SetStateAction<FormState>>;
}) {
	return (
		<>
			<LoadingDialog
				isOpen={currentState === "submitting"}
				title="Estamos realizando a operação..."
			/>
			<ErrorDialog
				isOpen={currentState === "error"}
				onClose={() => {
					setCurrentState(false);
				}}
			/>
		</>
	);
}

interface Props {
	form: UseFormReturn<z.infer<typeof formSchema>>;
}

function CreateProjectForm({ form }: Props) {
	return (
		<>
			<FormField
				control={form.control}
				name="name"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Nome do projeto</FormLabel>
						<FormControl>
							<Input
								placeholder="Insira o nome do projeto"
								{...field}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="description"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Descrição</FormLabel>
						<FormControl>
							<Textarea
								placeholder="Insira uma breve descrição do projeto"
								{...field}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="date"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Data</FormLabel>
						<FormControl>
							<EventPeriodPicker
								timeZone={NEW_EVENT_TIME_ZONE}
								value={{
									startDate: field.value.from,
									endDate: field.value.to,
								}}
								onChange={(period) =>
									field.onChange({
										from: period.startDate,
										to: period.endDate,
									})
								}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="location"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Endereço</FormLabel>
						<FormControl>
							<PlacePicker
								onPlaceChange={(place) => {
									field.onChange(place);
								}}
							/>
						</FormControl>
						<FormDescription>
							Selecione uma localização pesquisando ou clicando no
							mapa.
						</FormDescription>
						<FormMessage />
					</FormItem>
				)}
			/>
		</>
	);
}
