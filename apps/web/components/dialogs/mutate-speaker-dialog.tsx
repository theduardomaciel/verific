"use client";
import { useRouter } from "next/navigation";

import { useState, useEffect } from "react";

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
import { ErrorDialog, LoadingDialog, SuccessDialog } from "../forms/dialogs";
import FilePicker from "@/components/file-picker";
import { uploadImageToImgur } from "@/lib/upload";

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
import type { FormState } from "@/lib/types/forms";

const formSchema = z.object({
	name: z.string().min(2, {
		message: "Nome deve conter pelo menos 2 caracteres.",
	}),
	description: z.string().max(3000, {
		message: "Descrições devem ter no máximo 500 caracteres.",
	}),
	imageUrl: z
		.string()
		.url({ message: "Insira uma URL válida para a imagem." }),
});

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
			name: speaker?.name ?? "",
			description: speaker?.description ?? "",
			imageUrl: speaker?.imageUrl ?? "",
		},
	});

	// Sincroniza o formulário com a prop speaker sempre que ela mudar
	useEffect(() => {
		form.reset({
			name: speaker?.name ?? "",
			description: speaker?.description ?? "",
			imageUrl: speaker?.imageUrl ?? "",
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [speaker]);

	// Trocar para o endpoint correto, pois speakers está na raiz do router
	const updateMutation = trpc.updateSpeaker.useMutation();
	const createMutation = trpc.createSpeaker.useMutation();

	// Gerenciamos o envio do formulário
	async function onSubmit(data: z.infer<typeof formSchema>) {
		setCurrentState("submitting");

		console.log("data: ", data);

		// Se um arquivo foi selecionado, primeiro fazemos upload e substituímos imageUrl
		let imageUrl = data.imageUrl;
		if (selectedFiles && selectedFiles.length > 0 && selectedFiles[0]) {
			try {
				const result = await uploadImageToImgur(selectedFiles[0]);
				imageUrl = result.link;
			} catch (err) {
				console.error("Falha ao fazer upload da imagem:", err);
				setCurrentState("error");
				return;
			}
		}

		try {
			let speakerId = speaker?.id;

			if (speaker) {
				await updateMutation.mutateAsync({
					id: speaker.id,
					...data,
					imageUrl,
					projectId,
				});
			} else {
				const { id } = await createMutation.mutateAsync({
					...data,
					imageUrl,
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
			form.reset();
		} catch (error) {
			console.error(error);
			setCurrentState("error");
		}
	}

	const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null);

	if (isDesktop) {
		return (
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>{trigger}</DialogTrigger>
				<DialogContent className="sm:max-w-md">
					<Form {...form}>
						<form
							id="mutate-speaker-form"
							className="flex w-full flex-col space-y-6"
						>
							<DialogHeader>
								<DialogTitle>
									{speaker
										? "Editar palestrante"
										: "Adicionar palestrante"}
								</DialogTitle>
							</DialogHeader>
							<MutateSpeakerForm
								form={form}
								onFilesChange={setSelectedFiles}
							/>
							<DialogFooter className="w-full grid-cols-2 gap-3 md:grid">
								<DialogClose asChild>
									<Button type="button" variant={"outline"}>
										Cancelar
									</Button>
								</DialogClose>
								<Button
									type="button"
									disabled={
										form.formState.isSubmitting ||
										(speaker && !form.formState.isDirty)
									}
									// TODO: Fazemos o submit do formulário manualmente pois estamos acidentalmente rodando
									// o formulário da página junto com o do dialog/drawer
									onClick={async () => {
										// Manually trigger validation on all fields and wait for it to complete
										// Validate only textual fields first — imageUrl may be provided by file upload
										const isValid = await form.trigger([
											"name",
											"description",
										]);

										if (isValid) {
											// If valid, get values and submit
											const values = form.getValues();
											onSubmit(values);
										} else {
											// Log errors for debugging
											console.log(
												"Form validation failed:",
												form.formState.errors,
											);
										}
									}}
								>
									{speaker ? "Salvar" : "Criar"}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
				<StatusDialogs
					currentState={currentState}
					onClose={(refresh) => {
						if (refresh) {
							router.refresh();
						}
						setCurrentState(false);
						setOpen(false);
					}}
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
						id="mutate-speaker-form"
						className="flex w-full flex-col"
					>
						<DrawerHeader className="text-left">
							<DrawerTitle>
								{speaker
									? "Editar palestrante"
									: "Adicionar palestrante"}
							</DrawerTitle>
						</DrawerHeader>
						<div className="space-y-6 px-4">
							<MutateSpeakerForm
								form={form}
								onFilesChange={setSelectedFiles}
							/>
						</div>
						<DrawerFooter className="flex w-full gap-2">
							<Button
								type="button"
								// TODO: Fazemos o submit do formulário manualmente pois estamos acidentalmente rodando
								// o formulário da página junto com o do dialog/drawer
								onClick={async () => {
									// Manually trigger validation on all fields and wait for it to complete
									const isValid = await form.trigger([
										"name",
										"description",
									]);

									if (isValid) {
										// If valid, get values and submit
										const values = form.getValues();
										onSubmit(values);
									} else {
										// Log errors for debugging
										console.log(
											"Form validation failed:",
											form.formState.errors,
										);
									}
								}}
							>
								{speaker ? "Atualizar" : "Criar"}
							</Button>
							<DrawerClose asChild>
								<Button type="button" variant="outline">
									Cancelar
								</Button>
							</DrawerClose>
						</DrawerFooter>
					</form>
				</Form>
			</DrawerContent>
			<StatusDialogs
				currentState={currentState}
				onClose={(refresh) => {
					if (refresh) {
						router.refresh();
					}
					setCurrentState(false);
					setOpen(false);
				}}
			/>
		</Drawer>
	);
}

function StatusDialogs({
	currentState,
	onClose,
}: {
	currentState: FormState;
	onClose: (refresh?: boolean) => void;
}) {
	return (
		<>
			<SuccessDialog
				isOpen={currentState === "submitted"}
				onClose={() => onClose(true)}
				description={<>O palestrante foi salvo com sucesso!</>}
			/>
			<LoadingDialog
				isOpen={currentState === "submitting"}
				title="Estamos realizando a operação..."
			/>
			<ErrorDialog
				isOpen={currentState === "error"}
				onClose={() => onClose()}
			/>
		</>
	);
}

interface MutateSpeakerForm {
	form: UseFormReturn<z.infer<typeof formSchema>>;
	onFilesChange?: (files: File[] | null) => void;
}

function MutateSpeakerForm({ form, onFilesChange }: MutateSpeakerForm) {
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
							{/* Substituído por FilePicker — mantemos o field para mensagens e integração com o RHF */}
							<FilePicker
								initialPreviewUrl={field.value ?? null}
								onFilesChange={(files) => {
									onFilesChange?.(files ?? null);
									// Se o usuário removeu o arquivo selecionado, mantemos o valor antigo no form
									if (!files) return;
									// Não atualizamos o campo imageUrl aqui — será atualizado após upload
								}}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</>
	);
}
