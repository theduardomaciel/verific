"use client";

import { useState, useCallback } from "react";

// Icons
import { Plus } from "lucide-react";

// Components
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlacePicker } from "@/components/place-picker";

// Hooks
import { useMediaQuery } from "@/hooks/use-media-query";

// Form
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
	name: z.string().min(2, {
		message: "Nome deve conter pelo menos 2 caracteres.",
	}),
	description: z
		.string()
		.min(10, {
			message: "Descrições devem ter no mínimo 10 caracteres.",
		})
		.max(3000, {
			message: "Descrições devem ter no máximo 3000 caracteres.",
		}),
	location: z.object({
		address: z.string().min(1, {
			message: "Por favor, selecione um endereço.",
		}),
		latitude: z.number(),
		longitude: z.number(),
	}),
});

type PlacePickerType = z.infer<typeof formSchema>["location"];

export function CreateProjectDialog() {
	const [open, setOpen] = useState(false);
	const isDesktop = useMediaQuery("(min-width: 768px)");

	const [locationValue, setLocationValue] = useState<
		PlacePickerType | undefined
	>(undefined);

	const onPlaceChange = useCallback((place: PlacePickerType) => {
		setLocationValue(place);
	}, []);

	// Inicializamos o formulário com o Zod e o React Hook Form
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			description: "",
			location: {
				address: "",
				latitude: 0,
				longitude: 0,
			},
		},
	});

	// Gerenciamos o envio do formulário
	function onSubmit(values: z.infer<typeof formSchema>) {
		// Use data
		console.log(values);
	}

	if (isDesktop) {
		return (
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button
						className="bg-primary flex w-full items-center justify-center gap-2 py-6 leading-none"
						size={"lg"}
					>
						<Plus className="mt-0.5" />
						Criar novo projeto
					</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Criar projeto</DialogTitle>
					</DialogHeader>
					<CreateProjectForm
						form={form}
						locationValue={locationValue}
						onPlaceChange={onPlaceChange}
						onSubmit={onSubmit}
					/>
					<DialogFooter className="w-full grid-cols-2 gap-3 md:grid">
						<DialogClose asChild>
							<Button type="button" variant={"outline"}>
								Cancelar
							</Button>
						</DialogClose>
						<Button type="submit">Criar</Button>
					</DialogFooter>
				</DialogContent>
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

				<div className="px-4">
					<CreateProjectForm
						form={form}
						locationValue={locationValue}
						onPlaceChange={onPlaceChange}
						onSubmit={onSubmit}
					/>
				</div>

				<DrawerFooter className="flex w-full gap-2">
					<Button>Criar</Button>
					<DrawerClose asChild>
						<Button variant="outline">Cancelar</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

interface Props {
	form: UseFormReturn<z.infer<typeof formSchema>>;
	locationValue?: PlacePickerType;
	onPlaceChange?: (place: PlacePickerType) => void;
	onSubmit: (values: z.infer<typeof formSchema>) => void;
}

function CreateProjectForm({
	form,
	locationValue,
	onPlaceChange,
	onSubmit,
}: Props) {
	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="flex w-full flex-col space-y-6"
			>
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
						<FormItem className="space-y-2">
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
					name="location"
					render={({ field }) => (
						<FormItem className="flex w-full flex-col">
							<FormControl className="flex w-full flex-col">
								<PlacePicker
									defaultValue={locationValue}
									onPlaceChange={onPlaceChange}
								/>
							</FormControl>
							<FormDescription>
								Selecione uma localização pesquisando ou
								clicando no mapa.
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
			</form>
		</Form>
	);
}
