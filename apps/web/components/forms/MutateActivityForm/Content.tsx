"use client";
import { useRouter } from "next/navigation";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Icons
import {
	ArrowLeft,
	CloudUpload,
	Edit,
	EditIcon,
	Plus,
	TrashIcon,
} from "lucide-react";

// Components
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, InputWithSuffix } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { InstancePicker } from "@/components/pickers/instance-picker";
import { MutateSpeakerDialog } from "@/components/dialogs/mutate-speaker-dialog";
import { SpeakerDeleteDialog } from "@/components/dialogs/delete-dialog";

// Date and Time
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { TimePicker } from "@/components/pickers/time-picker";

// API
import { trpc } from "@/lib/trpc/react";

// Types
import { RouterOutput } from "@verific/api";
import {
	activityCategories,
	activityCategoryLabels,
} from "@verific/drizzle/enum/category";
import type { MutateActivityFormSchema } from "@/lib/validations/forms/mutate-activity-form";
import { useWatch, type UseFormReturn } from "react-hook-form";

interface Props {
	form: UseFormReturn<MutateActivityFormSchema>;
	projectId: string;
	isEditing?: boolean;
}

type Speaker = RouterOutput["getSpeakers"][number];

export function MutateActivityFormContent({
	form,
	projectId,
	isEditing,
}: Props) {
	const {
		data: speakers,
		isLoading,
		error,
		refetch,
	} = trpc.getSpeakers.useQuery({ projectId });

	const utils = trpc.useUtils();

	const router = useRouter();

	const formSpeakerId = useWatch({
		control: form.control,
		name: "speakerId",
	});

	const currentSpeaker = speakers?.find(
		(speaker: Speaker) => speaker.id.toString() === formSpeakerId,
	);

	return (
		<div
			className={
				"relative flex w-full flex-1 flex-col items-start justify-start gap-9 md:flex-row"
			}
		>
			<div className="flex h-full w-full flex-col items-start justify-start gap-9">
				<Button
					type="button"
					variant="secondary"
					size={"lg"}
					onClick={() => router.back()}
				>
					<ArrowLeft size={24} />
					Voltar
				</Button>
				<h1 className="text-5xl font-extrabold">
					{isEditing ? "Editar" : "Nova"} atividade
				</h1>
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem className="w-full">
							<FormLabel>Nome</FormLabel>
							<FormControl>
								<Input
									placeholder="Workshop de React"
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
						<FormItem className="w-full">
							<FormLabel>Descrição</FormLabel>
							<FormControl>
								<Textarea {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex w-full flex-row items-start justify-start gap-3">
					<FormField
						control={form.control}
						name="participantsLimit"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormLabel>Limite de vagas</FormLabel>
								<FormControl>
									<InputWithSuffix
										suffix=" vagas"
										className="w-full flex-1"
										type="number"
										placeholder="Sem limite"
										{...field}
										// TODO: Por enquanto, setamos diretamente o value para "" pois o valor "undefined"
										// não pode ser passado para um input controlado.
										value={
											field.value === undefined
												? ""
												: field.value
										}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="tolerance"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormLabel>Tolerância</FormLabel>
								<FormControl>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value?.toString()}
									>
										<SelectTrigger className="w-full flex-1">
											<SelectValue placeholder="0" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="0">
												Não incluir fila de espera
											</SelectItem>
											<SelectItem value="5">
												5 minutos
											</SelectItem>
											<SelectItem value="10">
												10 minutos
											</SelectItem>
											<SelectItem value="15">
												15 minutos
											</SelectItem>
											<SelectItem value="20">
												20 minutos
											</SelectItem>
										</SelectContent>
									</Select>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<FormField
					control={form.control}
					name="audience"
					render={({ field }) => (
						<FormItem className="w-full">
							<FormLabel>Público</FormLabel>
							<Select
								onValueChange={field.onChange}
								defaultValue={"internal"}
							>
								<FormControl>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Selecione o público" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem value="internal">
										Interno
									</SelectItem>
									<SelectItem value="external">
										Externo
									</SelectItem>
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="speakerId"
					render={({ field }) => (
						<FormItem className="w-full">
							<FormLabel>Palestrante</FormLabel>
							<div className="flex w-full flex-row items-center justify-between gap-3">
								<InstancePicker
									isLoading={isLoading}
									error={error?.message}
									items={
										speakers
											? speakers.map((speaker) => ({
													id: speaker.id.toString(),
													label: speaker.name,
													image: speaker.imageUrl,
												}))
											: []
									}
									maxItems={1}
									actionButton={
										<MutateSpeakerDialog
											projectId={projectId}
											trigger={
												<Button
													type="button"
													className="w-full"
													variant="outline"
												>
													<Plus size={16} />
													Adicionar novo palestrante
												</Button>
											}
											onSuccess={() => {
												utils.getSpeakers.invalidate();
												refetch()
													.catch((error) => {
														console.error(
															"Error refetching speakers:",
															error,
														);
													})
													.then(() => {
														field.onChange(""); // Resetar campo após adicionar/excluir
													});
											}}
										/>
									}
									initialItems={field.value}
									onSelect={(items) => {
										field.onChange(items[0]);
										/* console.log(
											"Current speaker:",
											currentSpeaker,
										); */
									}}
									placeholder={
										isLoading
											? "Carregando palestrantes..."
											: "Selecione um palestrante"
									}
									emptyText="Nenhum palestrante encontrado"
								/>
								{currentSpeaker ? (
									<>
										<MutateSpeakerDialog
											projectId={projectId}
											speaker={currentSpeaker}
											trigger={
												<Button
													type="button"
													size={"icon"}
													variant={"outline"}
													className="h-full px-6"
												>
													<EditIcon size={16} />
												</Button>
											}
											onSuccess={() => {
												refetch()
													.catch((error) => {
														console.error(
															"Error refetching speakers:",
															error,
														);
													})
													.then(() => {
														toast.success(
															"Palestrante atualizado com sucesso!",
														);
													});
											}}
										/>
										<SpeakerDeleteDialog
											speakerId={currentSpeaker.id}
											onSuccess={() => {
												refetch()
													.catch((error) => {
														console.error(
															"Error refetching speakers:",
															error,
														);
													})
													.then(() => {
														toast.success(
															"Palestrante excluído com sucesso!",
														);
														field.onChange(""); // Resetar campo após adicionar/excluir
													});
											}}
										>
											<Button
												type="button"
												size={"icon"}
												variant={"outline"}
												className="h-full px-6"
											>
												<TrashIcon size={16} />
											</Button>
										</SpeakerDeleteDialog>
									</>
								) : null}
							</div>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex w-full flex-row items-start justify-start gap-3">
					<FormField
						control={form.control}
						name="category"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormLabel>Categoria</FormLabel>
								<FormControl>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<SelectTrigger className="w-full flex-1">
											<SelectValue placeholder="Selecione a categoria" />
										</SelectTrigger>
										<SelectContent>
											{activityCategories.map(
												(category) => (
													<SelectItem
														key={category}
														value={category}
													>
														{
															activityCategoryLabels[
																category
															]
														}
													</SelectItem>
												),
											)}
										</SelectContent>
									</Select>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="workload"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormLabel>Carga horária</FormLabel>
								<FormControl>
									<InputWithSuffix
										suffix=" horas"
										className="w-full flex-1"
										type="number"
										placeholder="Sem carga horária"
										{...field}
										// TODO: Por enquanto, setamos diretamente o value para "" pois o valor "undefined"
										// não pode ser passado para um input controlado.
										value={
											field.value === undefined
												? ""
												: field.value
										}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</div>
			<div
				className={cn(
					"sticky top-4 right-0 flex h-full w-full flex-col items-start justify-start gap-6 md:gap-4",
				)}
			>
				<div
					className={
						"border-border flex w-full flex-col gap-6 md:rounded-2xl md:border md:p-9"
					}
				>
					<FormField
						control={form.control}
						name="dateFrom"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>Data</FormLabel>
								<div className="w-full">
									<Calendar
										mode="single"
										lang="pt-br"
										locale={ptBR}
										selected={field.value}
										onSelect={field.onChange}
										defaultMonth={field.value}
										disabled={(date) => {
											const today = new Date();
											today.setHours(0, 0, 0, 0);
											return date < today;
										}}
										className="w-full rounded-md border"
									/>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>
					<div className="flex w-full flex-col items-start justify-start gap-2">
						<FormLabel>Horário</FormLabel>
						<div className="flex w-full flex-row items-center justify-between gap-3">
							<FormField
								control={form.control}
								name="timeFrom"
								render={({ field }) => (
									<FormItem className="w-full">
										<TimePicker
											value={field.value}
											onChange={field.onChange}
											placeholder={"HH:MM"}
										/>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="h-0.5 w-[15px] rounded-full bg-gray-400" />
							<div className="flex w-full flex-row items-center justify-between">
								<FormField
									control={form.control}
									name="timeTo"
									render={({ field }) => (
										<FormItem className="w-full">
											<TimePicker
												value={field.value}
												onChange={field.onChange}
												placeholder={"HH:MM"}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>
					</div>
				</div>

				<div className="flex w-full flex-row items-center justify-end">
					<Button
						type="submit"
						size={"lg"}
						className="!px-6 max-md:w-full"
					>
						{isEditing ? (
							<>
								<Edit className="h-6 w-6" />
								Editar atividade
							</>
						) : (
							<>
								<CloudUpload className="h-6 w-6" />
								Cadastrar atividade
							</>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
