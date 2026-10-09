"use client";
import { useRouter } from "next/navigation";
import * as React from "react";

// Icons
import {
	ArrowLeft,
	ClipboardList,
	CloudUpload,
	Edit,
	EditIcon,
	EqualApproximately,
	Plus,
	TrashIcon,
	User,
} from "lucide-react";
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
// Components
import { toast } from "sonner";

// Types
import type { RouterOutput } from "@verific/api";
import { tagColors } from "@verific/api/schemas";
import {
	activityCategories,
	activityCategoryLabels,
} from "@verific/drizzle/enum/category";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
// Date and Time
import { Calendar } from "@/components/ui/calendar";
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input, InputWithSuffix } from "@/components/ui/input";
import { MarkdownTextarea } from "@/components/ui/markdown-textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

import { SpeakerDeleteDialog } from "@/components/dialogs/delete-dialog";
import { MutateSpeakerDialog } from "@/components/dialogs/mutate-speaker-dialog";
import { InstancePicker } from "@/components/pickers/instance-picker";
import { TimePicker } from "@/components/pickers/time-picker";

import { sumSessionsHours } from "@/lib/date";
// API
import { trpc } from "@/lib/trpc/react";

import type { MutateActivityFormSchema } from "@/lib/validations/forms/mutate-activity-form";

interface Props {
	form: UseFormReturn<MutateActivityFormSchema>;
	projectId: string;
	endDate?: Date;
	isEditing?: boolean;
	/**
	 * Your "Adicionar formulário" button, or the attached-form summary row
	 * (name + field count + edit/remove). Falls back to a disabled placeholder.
	 */
	registrationFormAction?: React.ReactNode;
	/**
	 * Secondary save action (e.g. "save and configure form").
	 * Rendered next to the primary submit when provided.
	 */
	onSecondarySubmit?: () => void;
}

type Speaker = RouterOutput["getSpeakers"][number];

/* -------------------------------------------------------------------------- */
/*                            Registration settings                           */
/* -------------------------------------------------------------------------- */

function RegistrationSettings({
	form,
	formAction,
}: {
	form: UseFormReturn<MutateActivityFormSchema>;
	formAction: React.ReactNode;
}) {
	// Esconde os campos da fila quando desligada; os valores seguem salvos
	// no formulário (sem `shouldUnregister`, desmontar não apaga).
	const waitlistEnabled =
		useWatch({ control: form.control, name: "waitlistEnabled" }) ?? true;
	return (
		<div className="w-full rounded-lg border">
			<FormField
				control={form.control}
				name="isRegistrationOpen"
				render={({ field }) => (
					<FormItem className="flex flex-row items-center justify-between gap-4 space-y-0 p-4">
						<div className="flex flex-col gap-0.5">
							<FormLabel>Permitir inscrições</FormLabel>
						</div>
						<FormControl>
							<Switch
								checked={field.value}
								onCheckedChange={field.onChange}
							/>
						</FormControl>
					</FormItem>
				)}
			/>

			<div className="flex flex-col gap-4 border-t p-4">
				<FormField
					control={form.control}
					name="waitlistEnabled"
					render={({ field }) => (
						<FormItem className="flex flex-row items-center justify-between gap-4 space-y-0">
							<div className="flex flex-col gap-0.5">
								<FormLabel>Habilitar fila de espera</FormLabel>
								<p className="text-muted-foreground text-sm">
									Quando as vagas acabarem, participantes
									poderão entrar em uma fila e receber a vaga
									caso alguém desista.
								</p>
							</div>
							<FormControl>
								<Switch
									checked={field.value ?? true}
									onCheckedChange={field.onChange}
								/>
							</FormControl>
						</FormItem>
					)}
				/>

				<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
					<FormField
						control={form.control}
						name="participantsLimit"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Limite de vagas</FormLabel>
								<FormControl>
									<InputWithSuffix
										suffix=" vagas"
										className="w-full"
										type="number"
										placeholder="Sem limite"
										{...field}
										// TODO: Por enquanto, setamos diretamente o value para "" pois o valor "undefined"
										// não pode ser passado para um input controlado.
										value={field.value ?? ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					{waitlistEnabled ? (
						<FormField
							control={form.control}
							name="tolerance"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Tempo de tolerância</FormLabel>
									<Select
										onValueChange={field.onChange}
										value={field.value?.toString() ?? ""}
									>
										<FormControl>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Selecione" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="0">
												Sem tolerância
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
									<FormMessage />
								</FormItem>
							)}
						/>
					) : null}
				</div>

				{waitlistEnabled ? (
					<FormField
						control={form.control}
						name="waitlistOfferHours"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									Prazo para confirmar vaga da fila
								</FormLabel>
								<Select
									onValueChange={field.onChange}
									value={field.value?.toString() ?? ""}
								>
									<FormControl>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Selecione" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{[1, 2, 6, 12, 24, 48].map((hours) => (
											<SelectItem
												key={hours}
												value={hours.toString()}
											>
												{hours === 1
													? "1 hora"
													: `${hours} horas`}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-muted-foreground text-sm">
									Com as vagas esgotadas, quem entra na fila
									recebe a vaga que abrir e tem este prazo
									para confirmar, sempre antes do início da
									atividade.
								</p>
								<FormMessage />
							</FormItem>
						)}
					/>
				) : null}

				<FormField
					control={form.control}
					name="allowOverlap"
					render={({ field }) => (
						<FormItem className="flex flex-row items-center justify-between gap-4 space-y-0 border-t pt-4">
							<div className="flex flex-col gap-0.5">
								<FormLabel>
									Permitir sobreposição de horário
								</FormLabel>
								<p className="text-muted-foreground text-sm">
									Participantes poderão se inscrever nesta
									atividade mesmo que ela aconteça no mesmo
									horário de outras, e em outras que acontecem
									no horário dela. Use para atividades longas,
									como maratonas, exposições e estandes.
								</p>
							</div>
							<FormControl>
								<Switch
									checked={field.value ?? false}
									onCheckedChange={field.onChange}
								/>
							</FormControl>
						</FormItem>
					)}
				/>

				<div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
					<div className="flex flex-col gap-0.5">
						<p className="text-sm leading-none font-medium">
							Formulário de inscrição
						</p>
						<p className="text-muted-foreground text-sm">
							Adiciona um formulário customizado para os
							participantes
						</p>
					</div>
					{formAction}
				</div>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*                               Sessions editor                              */
/* -------------------------------------------------------------------------- */

const setTimeOnDate = (date: Date, time: string) => {
	const timeParts = time.split(":");
	date.setUTCHours(Number(timeParts[0]) + 3, Number(timeParts[1]));
};

function buildSessionIntervals(
	sessions: Array<{ date: Date; timeFrom: string; timeTo: string }>,
) {
	const intervals: Array<{ startsAt: Date; endsAt: Date }> = [];
	for (const session of sessions) {
		if (!session?.date || !session.timeFrom || !session.timeTo) continue;
		const startsAt = new Date(session.date);
		setTimeOnDate(startsAt, session.timeFrom);
		const endsAt = new Date(session.date);
		setTimeOnDate(endsAt, session.timeTo);
		if (endsAt > startsAt) intervals.push({ startsAt, endsAt });
	}
	return intervals;
}

function SessionsEditor({
	form,
}: {
	form: UseFormReturn<MutateActivityFormSchema>;
}) {
	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "sessions",
	});

	return (
		<div className="flex w-full flex-col gap-4">
			{fields.map((field, index) => (
				<div
					key={field.id}
					className="mx-auto flex w-full max-w-full flex-col gap-4 rounded-2xl border p-5 md:mx-0 md:w-fit"
				>
					<div className="flex w-full items-center justify-between gap-2">
						<p className="text-sm font-semibold">
							Sessão {index + 1}
						</p>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							aria-label={`Remover sessão ${index + 1}`}
							disabled={fields.length <= 1}
							onClick={() => remove(index)}
						>
							<TrashIcon size={14} />
						</Button>
					</div>

					<FormField
						control={form.control}
						name={`sessions.${index}.date` as const}
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>Data</FormLabel>
								<div className="flex w-full justify-center">
									<Calendar
										mode="single"
										lang="pt-br"
										selected={field.value}
										onSelect={field.onChange}
										defaultMonth={field.value}
										disabled={(date) => {
											const today = new Date();
											today.setHours(0, 0, 0, 0);
											return date < today;
										}}
										className="max-w-full rounded-md border [--cell-size:2rem] min-[375px]:[--cell-size:2.15rem] min-[1024px]:[--cell-size:3rem] min-[1280px]:[--cell-size:3.25rem]"
									/>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="flex w-full flex-col items-start justify-start gap-2">
						<FormLabel>Horário</FormLabel>
						<div className="flex w-full flex-row items-start justify-between gap-3">
							<FormField
								control={form.control}
								name={`sessions.${index}.timeFrom` as const}
								render={({ field }) => (
									<FormItem className="w-full">
										<TimePicker
											value={field.value}
											onChange={field.onChange}
											placeholder="HH:MM"
										/>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="mt-5 h-0.5 w-3.75 shrink-0 rounded-full bg-gray-400" />
							<FormField
								control={form.control}
								name={`sessions.${index}.timeTo` as const}
								render={({ field }) => (
									<FormItem className="w-full">
										<TimePicker
											value={field.value}
											onChange={field.onChange}
											placeholder="HH:MM"
										/>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					<FormField
						control={form.control}
						name={`sessions.${index}.address` as const}
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>
									Local da sessão{" "}
									<span className="text-muted-foreground font-normal">
										(opcional)
									</span>
								</FormLabel>
								<FormControl>
									<Input
										placeholder="Sala 101"
										{...field}
										value={field.value ?? ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			))}

			<Button
				type="button"
				variant="outline"
				className="w-full"
				onClick={() =>
					append({
						date: new Date(),
						timeFrom: "",
						timeTo: "",
						address: "",
					})
				}
			>
				<Plus size={16} />
				Adicionar sessão
			</Button>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*                                 Tags picker                                */
/* -------------------------------------------------------------------------- */

function TagsPicker({
	form,
	projectId,
}: {
	form: UseFormReturn<MutateActivityFormSchema>;
	projectId: string;
}) {
	const utils = trpc.useUtils();
	const { data: tags, isLoading } = trpc.getProjectTags.useQuery({
		projectId,
	});
	const createTag = trpc.createTag.useMutation();

	const [newTagName, setNewTagName] = React.useState("");
	const [newTagColor, setNewTagColor] = React.useState<string>(tagColors[1]!);

	const createAndSelect = async () => {
		const name = newTagName.trim();
		if (!name) return;
		try {
			const created = await createTag.mutateAsync({
				projectId,
				name,
				color: newTagColor as (typeof tagColors)[number],
			});
			await utils.getProjectTags.invalidate({ projectId });
			const current = form.getValues("tagIds") ?? [];
			if (created?.id && !current.includes(created.id)) {
				form.setValue("tagIds", [...current, created.id]);
			}
			setNewTagName("");
		} catch {
			toast.error("Não foi possível criar a trilha.");
		}
	};

	return (
		<FormField
			control={form.control}
			name="tagIds"
			render={({ field }) => (
				<FormItem className="w-full">
					<FormLabel>Trilhas</FormLabel>
					<div className="flex flex-wrap gap-2">
						{isLoading ? (
							<p className="text-muted-foreground text-sm">
								Carregando trilhas...
							</p>
						) : null}
						{(tags ?? []).map((tag) => {
							const selected = (field.value ?? []).includes(
								tag.id,
							);
							return (
								<button
									key={tag.id}
									type="button"
									onClick={() => {
										const current = field.value ?? [];
										field.onChange(
											selected
												? current.filter(
														(id) => id !== tag.id,
													)
												: [...current, tag.id],
										);
									}}
									className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
										selected
											? "border-primary bg-primary/10"
											: "hover:bg-muted"
									}`}
								>
									<span
										className="h-2.5 w-2.5 rounded-full"
										style={{
											backgroundColor: tag.color,
										}}
									/>
									{tag.name}
								</button>
							);
						})}
					</div>
					<div className="flex flex-col gap-2">
						<div className="flex w-full gap-2">
							<Input
								placeholder="Nova trilha (ex.: Hardware)"
								value={newTagName}
								maxLength={30}
								className="flex-1"
								onChange={(e) => setNewTagName(e.target.value)}
							/>
							<Button
								type="button"
								variant="outline"
								disabled={
									!newTagName.trim() || createTag.isPending
								}
								onClick={() => void createAndSelect()}
							>
								<Plus size={16} />
								Criar
							</Button>
						</div>
						{newTagName.trim() ? (
							<div className="flex flex-wrap gap-1.5">
								{tagColors.map((color) => (
									<button
										key={color}
										type="button"
										title={color}
										onClick={() => setNewTagColor(color)}
										className={`h-6 w-6 rounded-full border-2 transition-transform ${
											newTagColor === color
												? "border-foreground scale-110"
												: "border-transparent"
										}`}
										style={{ backgroundColor: color }}
									/>
								))}
							</div>
						) : null}
					</div>
					<FormDescription>
						Agrupe atividades em diferentes trilhas. Máximo de 5 por
						atividade.
					</FormDescription>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

/* -------------------------------------------------------------------------- */
/*                                 Main content                               */
/* -------------------------------------------------------------------------- */

export function MutateActivityFormContent({
	form,
	projectId,
	isEditing,
	registrationFormAction,
	onSecondarySubmit,
}: Props) {
	const {
		data: speakers,
		isLoading,
		error,
		refetch,
	} = trpc.getSpeakers.useQuery({ projectId });

	const utils = trpc.useUtils();

	const router = useRouter();

	const formSpeakerIds = useWatch({
		control: form.control,
		name: "speakerIds",
	});

	const currentSpeakers =
		speakers?.filter((speaker: Speaker) =>
			formSpeakerIds?.includes(speaker.id),
		) || [];

	return (
		<div className="mx-auto flex w-full flex-1 flex-col gap-8">
			{/* Sticky header: navigation, title and primary action */}
			<header className="bg-background/80 sticky top-0 z-20 flex items-center justify-between gap-4 border-b py-3 backdrop-blur">
				<div className="flex min-w-0 items-center gap-3">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="Voltar"
						onClick={() => router.back()}
					>
						<ArrowLeft size={20} />
					</Button>
					<h1 className="truncate text-2xl font-extrabold md:text-3xl">
						{isEditing ? "Editar" : "Nova"} atividade
					</h1>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{onSecondarySubmit && !isEditing ? (
						<Button
							type="button"
							size="lg"
							variant="outline"
							className="shrink-0"
							onClick={onSecondarySubmit}
						>
							<ClipboardList className="h-5 w-5" />
							<span className="hidden sm:inline">
								Cadastrar e configurar formulário
							</span>
							<span className="sm:hidden">+ Formulário</span>
						</Button>
					) : null}
					<Button type="submit" size="lg" className="shrink-0 px-5!">
						{isEditing ? (
							<>
								<Edit className="h-5 w-5" />
								<span className="hidden sm:inline">
									Editar atividade
								</span>
								<span className="sm:hidden">Editar</span>
							</>
						) : (
							<>
								<CloudUpload className="h-5 w-5" />
								<span className="hidden sm:inline">
									Cadastrar atividade
								</span>
								<span className="sm:hidden">Cadastrar</span>
							</>
						)}
					</Button>
				</div>
			</header>

			<div className="flex w-full flex-col items-start gap-10 md:flex-row xl:gap-24">
				{/* ------------------------------ Main column ------------------------------ */}
				<div className="flex w-full min-w-0 flex-1 flex-col gap-6">
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
									<MarkdownTextarea
										value={field.value}
										onChange={field.onChange}
									/>
								</FormControl>
								<FormDescription>
									Suporte a Markdown.
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						<FormField
							control={form.control}
							name="category"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Categoria</FormLabel>
									<Select
										onValueChange={field.onChange}
										value={field.value ?? ""}
									>
										<FormControl>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Selecione a categoria" />
											</SelectTrigger>
										</FormControl>
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
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="workload"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Carga horária</FormLabel>
									<FormControl>
										<div className="flex flex-row gap-2">
											<InputWithSuffix
												suffix=" horas"
												containerClassName="flex-1"
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
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															type="button"
															variant="outline"
															size="icon"
															title="Calcular carga horária"
															onClick={() =>
																// Soma a duração de todas as sessões
																field.onChange(
																	sumSessionsHours(
																		buildSessionIntervals(
																			form.getValues()
																				.sessions ??
																				[],
																		),
																	),
																)
															}
														>
															<EqualApproximately
																size={20}
															/>
														</Button>
													</TooltipTrigger>
													<TooltipContent className="sm:max-w-32">
														<p>
															Calcula a carga
															horária com base no
															intervalo de tempo
															definido.
														</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<FormField
							control={form.control}
							name="audience"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Público</FormLabel>
									<Select
										onValueChange={field.onChange}
										value={field.value ?? ""}
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
												Todos podem participar
											</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="address"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Local</FormLabel>
									<FormControl>
										<Input
											placeholder="Laboratório de Informática"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<TagsPicker form={form} projectId={projectId} />

					<FormField
						control={form.control}
						name="speakerIds"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>Palestrantes</FormLabel>
								<div className="flex w-full flex-col items-center justify-between gap-3">
									<InstancePicker
										className="w-full"
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
										maxItems={undefined}
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
														Adicionar novo
														palestrante
													</Button>
												}
												onSuccess={() => {
													void utils.getSpeakers.invalidate();
													// Keep existing speakers after adding new one
													void refetch().catch(
														(error) => {
															console.error(
																"Error refetching speakers:",
																error,
															);
														},
													);
												}}
											/>
										}
										initialItems={
											field.value?.map((id) =>
												id.toString(),
											) || []
										}
										onSelect={(items: string[]) => {
											field.onChange(
												items.map((id) => parseInt(id)),
											);
										}}
										placeholder={
											isLoading
												? "Carregando palestrantes..."
												: "Selecione os palestrantes"
										}
										emptyText="Nenhum palestrante encontrado"
									/>
									{currentSpeakers.length > 0 && (
										<div className="flex w-full flex-col gap-2">
											{currentSpeakers.map((speaker) => (
												<div
													key={speaker.id}
													className="flex items-center justify-between rounded-md border px-4 py-2.5"
												>
													<div className="flex items-center gap-2">
														<Avatar className="h-6 w-6">
															<AvatarImage
																src={
																	speaker.imageUrl ||
																	""
																}
															/>
															<AvatarFallback>
																<User className="h-4 w-4" />
															</AvatarFallback>
														</Avatar>
														<span className="text-sm font-medium">
															{speaker.name}
														</span>
													</div>
													<div className="flex gap-1">
														<MutateSpeakerDialog
															projectId={
																projectId
															}
															speaker={speaker}
															trigger={
																<Button
																	type="button"
																	size="icon"
																	variant="outline"
																	className="h-8 w-8"
																>
																	<EditIcon
																		size={
																			14
																		}
																	/>
																</Button>
															}
															onSuccess={() => {
																void (async () => {
																	try {
																		await refetch();
																		toast.success(
																			"Palestrante atualizado com sucesso!",
																		);
																	} catch (error) {
																		console.error(
																			"Error refetching speakers:",
																			error,
																		);
																	}
																})();
															}}
														/>
														<SpeakerDeleteDialog
															speakerId={
																speaker.id
															}
															onSuccess={() => {
																void (async () => {
																	try {
																		await refetch();
																		toast.success(
																			"Palestrante excluído com sucesso!",
																		);
																		// Remove this speaker from the selected list
																		field.onChange(
																			field.value?.filter(
																				(
																					id,
																				) =>
																					id !==
																					speaker.id,
																			) ||
																				[],
																		);
																	} catch (error) {
																		console.error(
																			"Error refetching speakers:",
																			error,
																		);
																	}
																})();
															}}
														>
															<Button
																type="button"
																size="icon"
																variant="outline"
																className="h-8 w-8"
															>
																<TrashIcon
																	size={14}
																/>
															</Button>
														</SpeakerDeleteDialog>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>

					<RegistrationSettings
						form={form}
						formAction={
							registrationFormAction ?? (
								<Button
									type="button"
									variant="outline"
									disabled
									className="shrink-0"
								>
									<Plus size={16} />
									Adicionar formulário
								</Button>
							)
						}
					/>
				</div>

				{/* ------------------------------ Side column ------------------------------ */}
				<aside className="w-full shrink-0 md:sticky md:top-24 md:w-auto">
					<SessionsEditor form={form} />
				</aside>
			</div>
		</div>
	);
}
