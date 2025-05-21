"use client";
import { useRouter } from "next/navigation";

import { useState } from "react";

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
import { ErrorDialog, LoadingDialog, SuccessDialog } from "./forms/dialogs";

// Hooks
import { useMediaQuery } from "@/hooks/use-media-query";

// Form
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";
import * as z from "zod";

// tRPC
import { trpc } from "@/lib/trpc/react";

// Types
import { RouterOutput } from "@verific/api";

const formSchema = z.object({
	name: z.string().min(2, {
		message: "Nome deve conter pelo menos 2 caracteres.",
	}),
	description: z.string().max(3000, {
		message: "Descrições devem ter no máximo 3000 caracteres.",
	}),
	imageUrl: z
		.string()
		.url({ message: "Insira uma URL válida para a imagem." }),
});

type FormState = false | "submitting" | "submitted" | "error";

interface Props {
	projectId: string;
	trigger: React.ReactNode;
	speaker?: RouterOutput["getSpeaker"];
	onSuccess?: (speaker: RouterOutput["getSpeaker"]) => void;
}

export function MutateSpeakerDialog({
	projectId,
	trigger,
	speaker,
	onSuccess,
}: Props) {
	const [currentState, setCurrentState] = useState<FormState>(false);
	const [open, setOpen] = useState(false);
	const isDesktop = useMediaQuery("(min-width: 768px)");

	const router = useRouter();

	// Inicializamos o formulário com o Zod e o React Hook Form
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			...speaker,
		},
	});

	// Trocar para o endpoint correto, pois speakers está na raiz do router
	const updateMutation = trpc.updateSpeaker.useMutation();
	const createMutation = trpc.createSpeaker.useMutation();

	// Gerenciamos o envio do formulário
	async function onSubmit(data: z.infer<typeof formSchema>) {
		setCurrentState("submitting");
		try {
			let speakerId = speaker?.id;

			if (speaker) {
				await updateMutation.mutateAsync({
					id: speaker.id,
					name: data.name,
					description: data.description,
					imageUrl: data.imageUrl,
					projectId,
				});
			} else {
				const { id } = await createMutation.mutateAsync({
					name: data.name,
					description: data.description,
					imageUrl: data.imageUrl,
					projectId,
				});
				speakerId = id;
			}

			if (onSuccess) {
				onSuccess({
					id: speakerId!,
					projectId,
					...data,
				});
			}

			setCurrentState("submitted");

			router.refresh();
		} catch (error) {
			console.error(error);
			setCurrentState("error");
		}
	}

	if (isDesktop) {
		return (
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>{trigger}</DialogTrigger>
				<DialogContent className="sm:max-w-md">
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit, (error) => {
								console.log(error);
								console.log(form.getValues());
							})}
							className="flex w-full flex-col space-y-6"
						>
							<DialogHeader>
								<DialogTitle>
									{speaker
										? "Editar palestrante"
										: "Adicionar palestrante"}
								</DialogTitle>
							</DialogHeader>
							<MutateSpeakerForm form={form} />
							<DialogFooter className="w-full grid-cols-2 gap-3 md:grid">
								<DialogClose asChild>
									<Button type="button" variant={"outline"}>
										Cancelar
									</Button>
								</DialogClose>
								<Button type="submit">
									{speaker ? "Salvar" : "Criar"}
								</Button>
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
			<DrawerTrigger asChild>{trigger}</DrawerTrigger>
			<DrawerContent>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="flex w-full flex-col space-y-6"
					>
						<DrawerHeader className="text-left">
							<DrawerTitle>
								{speaker
									? "Editar palestrante"
									: "Adicionar palestrante"}
							</DrawerTitle>
						</DrawerHeader>
						<div className="px-4">
							<MutateSpeakerForm form={form} />
						</div>
						<DrawerFooter className="flex w-full gap-2">
							<Button>{speaker ? "Atualizar" : "Criar"}</Button>
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
			<SuccessDialog
				isOpen={currentState === "submitted"}
				description={<>O palestrante foi salvo com sucesso!</>}
			/>
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

interface MutateSpeakerForm {
	form: UseFormReturn<z.infer<typeof formSchema>>;
}

function MutateSpeakerForm({ form }: MutateSpeakerForm) {
	return (
		<>
			<FormField
				control={form.control}
				name="name"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Nome do palestrante</FormLabel>
						<FormControl>
							<Input
								placeholder="Insira o nome do palestrante"
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
								placeholder="Insira uma breve descrição do palestrante"
								{...field}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="imageUrl"
				render={({ field }) => (
					<FormItem>
						<FormLabel>URL da imagem</FormLabel>
						<FormControl>
							<Input
								placeholder="https://exemplo.com/imagem.jpg"
								{...field}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</>
	);
}
