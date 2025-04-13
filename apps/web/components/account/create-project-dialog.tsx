"use client";

import { useState, useCallback } from "react";

// Icons
import { Plus } from "lucide-react";

// Components
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { PlacePicker } from "@/components/place-picker";

// Form
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

const placePickerSchema = z.object({
	address: z.string().min(1, {
		message: "Por favor, selecione um endereço.",
	}),
	latitude: z.number(),
	longitude: z.number(),
});

type PlacePickerType = z.infer<typeof placePickerSchema>;

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
	location: placePickerSchema,
});

export function CreateProjectDialog() {
	const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

	const [formData, setFormData] = useState<z.infer<typeof formSchema> | null>(
		null,
	);
	const [locationValue, setLocationValue] = useState({
		address: "",
		latitude: 0,
		longitude: 0,
	});

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
		setFormData(values);
		console.log(values);
	}

	return (
		<Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
			<DialogTrigger asChild>
				<Button
					className="w-full py-6 bg-primary flex items-center justify-center gap-2 leading-none"
					size={"lg"}
				>
					<Plus className="mt-0.5" />
					Criar novo projeto
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Criar projeto</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nome do projeto</FormLabel>
									<FormControl>
										<Input placeholder="Insira o nome do projeto" {...field} />
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
								<FormItem>
									<FormControl>
										<PlacePicker
											defaultValue={locationValue}
											onPlaceChange={onPlaceChange}
										/>
									</FormControl>
									<FormDescription>
										Selecione uma localização pesquisando ou clicando no mapa.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
					</form>
				</Form>
				<DialogFooter>
					<Button type="submit">Criar</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/* 
<DialogHeader>
					<DialogTitle>Criar projeto</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4">
					<Label htmlFor="name">Nome</Label>
					<Input id="name" placeholder="Insira o nome do projeto" />
				</div>
				<div className="grid">
					<Label className="mb-4" htmlFor="description">
						Descrição
					</Label>
					<Textarea
						id="description"
						placeholder="Insira uma breve descrição do projeto"
					/>
					<p className="text-sm text-muted-foreground mt-1.5">
						Máximo de 3000 caracteres
					</p>
				</div>
*/

/* 
<DialogContent>
				<DialogHeader>
					<DialogTitle>Create project</DialogTitle>
					<DialogDescription>
						Add a new project to manage products and customers.
					</DialogDescription>
				</DialogHeader>
				<div>
					<div className="space-y-4 py-2 pb-4">
						<div className="space-y-2">
							<Label htmlFor="name">Project name</Label>
							<Input id="name" placeholder="Acme Inc." />
						</div>
						<div className="space-y-2">
							<Label htmlFor="plan">Subscription plan</Label>
							<Select>
								<SelectTrigger>
									<SelectValue placeholder="Select a plan" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="free">
										<span className="font-medium">Free</span> -{" "}
										<span className="text-muted-foreground">
											Trial for two weeks
										</span>
									</SelectItem>
									<SelectItem value="pro">
										<span className="font-medium">Pro</span> -{" "}
										<span className="text-muted-foreground">
											$9/month per user
										</span>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setShowNewProjectDialog(false)}
					>
						Cancel
					</Button>
					<Button type="submit">Continue</Button>
				</DialogFooter>
			</DialogContent>
*/
