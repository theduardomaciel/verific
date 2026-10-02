"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@verific/zod";
import { toast } from "sonner";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";

import { useDashboard } from "@/components/dashboard/dashboard-context";
import { trpc } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
	GripVertical,
	Eye,
	Lock,
	PlusIcon,
	PencilIcon,
	TrashIcon,
	PencilRulerIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formFieldTypes } from "@verific/api/schemas";
import { downloadCsv, toCsv } from "@/lib/forms/csv";
import { formatAnswerValue } from "@verific/api/schemas";
import { findOrphanHalfIds, groupFieldsIntoRows } from "@/lib/forms/layout";
import { FormPreview } from "./preview";
import type { RouterOutput } from "@verific/api";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

type Version = RouterOutput["listVersions"][number];
type Field = RouterOutput["getVersion"]["fields"][number];

const fieldFormSchema = z.object({
	fieldId: z.string().optional(),
	label: z.string().min(1, "Obrigatório").max(200),
	type: z.enum(formFieldTypes),
	helpText: z.string().max(500).optional(),
	required: z.boolean().default(false),
	optionsText: z.string().optional(),
	min: z.string().optional(),
	max: z.string().optional(),
	minLength: z.string().optional(),
	maxLength: z.string().optional(),
	pattern: z.string().optional(),
	isVisible: z.boolean().default(true),
	editableAfterSignup: z.boolean().default(true),
	halfWidth: z.boolean().default(false),
});

type FieldFormValues = z.infer<typeof fieldFormSchema>;

function FieldDialog({
	versionId,
	initial,
	onDone,
	siblings,
	position,
}: {
	versionId: string;
	initial?: Field;
	onDone: () => void;
	/** Ordered fields of the version, for live row-pairing hints. */
	siblings?: Pick<Field, "id" | "label" | "halfWidth">[];
	/** Index of `initial` in `siblings`, or `siblings.length` for a new field at the end. */
	position?: number | null;
}) {
	const [open, setOpen] = useState(false);
	const utils = trpc.useUtils();
	const mutation = trpc.upsertField.useMutation({
		onSuccess: async () => {
			await utils.getVersion.invalidate();
			await utils.listVersions.invalidate();
			await utils.getPublishedForm.invalidate();
			toast.success("Campo salvo!");
			setOpen(false);
			onDone();
		},
		onError: (e) => toast.error(e.message),
	});

	const form = useForm<FieldFormValues>({
		resolver: zodResolver(fieldFormSchema) as never,
		defaultValues: {
			fieldId: initial?.id,
			label: initial?.label ?? "",
			type: (initial?.type as FieldFormValues["type"]) ?? "text",
			helpText: initial?.helpText ?? "",
			required: initial?.required ?? false,
			optionsText: (initial?.options ?? []).join("\n"),
			min: initial?.validation?.min?.toString() ?? "",
			max: initial?.validation?.max?.toString() ?? "",
			minLength: initial?.validation?.minLength?.toString() ?? "",
			maxLength: initial?.validation?.maxLength?.toString() ?? "",
			pattern: initial?.validation?.pattern ?? "",
			isVisible: initial?.isVisible ?? true,
			editableAfterSignup: initial?.editableAfterSignup ?? true,
			halfWidth: initial?.halfWidth ?? false,
		} as FieldFormValues,
	});

	const watchedType = form.watch("type");
	const watchedHalfWidth = form.watch("halfWidth");
	const needsOptions =
		watchedType === "select_single" || watchedType === "select_multiple";
	const showNumberRange = watchedType === "number";
	const showTextLength = watchedType === "text" || watchedType === "textarea";
	const showPattern = watchedType === "text";

	useEffect(() => {
		if (open) {
			form.reset({
				fieldId: initial?.id,
				label: initial?.label ?? "",
				type: (initial?.type as FieldFormValues["type"]) ?? "text",
				helpText: initial?.helpText ?? "",
				required: initial?.required ?? false,
				optionsText: (initial?.options ?? []).join("\n"),
				min: initial?.validation?.min?.toString() ?? "",
				max: initial?.validation?.max?.toString() ?? "",
				minLength: initial?.validation?.minLength?.toString() ?? "",
				maxLength: initial?.validation?.maxLength?.toString() ?? "",
				pattern: initial?.validation?.pattern ?? "",
				isVisible: initial?.isVisible ?? true,
				editableAfterSignup: initial?.editableAfterSignup ?? true,
				halfWidth: initial?.halfWidth ?? false,
			} as FieldFormValues);
		}
	}, [open, initial, form]);

	const rowHint = useMemo(() => {
		if (!siblings || position === undefined || position === null)
			return null;
		if (!watchedHalfWidth) return "Ocupará a linha inteira.";
		const hypothetical = siblings.map((s) => ({
			id: s.id,
			halfWidth: s.halfWidth ?? false,
		}));
		const selfId = initial?.id ?? "__new__";
		if (initial?.id) {
			const idx = hypothetical.findIndex((s) => s.id === initial.id);
			if (idx >= 0) hypothetical[idx] = { id: selfId, halfWidth: true };
		} else {
			hypothetical.splice(Math.min(position, hypothetical.length), 0, {
				id: selfId,
				halfWidth: true,
			});
		}
		const rows = groupFieldsIntoRows(hypothetical);
		const row = rows.find((r) => r.fields.some((f) => f.id === selfId));
		if (!row) return null;
		if (row.orphan || row.fields.length < 2) {
			return "Atenção: ficará sozinha e ocupará a linha inteira — ative “Meia largura” no campo vizinho para dividir a linha.";
		}
		const partner = row.fields.find((f) => f.id !== selfId);
		const partnerLabel = siblings.find((s) => s.id === partner?.id)?.label;
		return partnerLabel
			? `Vai dividir a linha com “${partnerLabel}”.`
			: "Vai dividir a linha com o campo vizinho.";
	}, [siblings, position, watchedHalfWidth, initial?.id]);

	function submit(values: FieldFormValues) {
		const num = (v?: string) =>
			v && v.trim() !== "" ? Number(v) : undefined;
		const options =
			needsOptions && values.optionsText
				? values.optionsText
						.split("\n")
						.map((s) => s.trim())
						.filter(Boolean)
				: undefined;
		const validation =
			values.type === "number"
				? { min: num(values.min), max: num(values.max) }
				: values.type === "text"
					? {
							minLength: num(values.minLength),
							maxLength: num(values.maxLength),
							pattern: values.pattern || undefined,
						}
					: values.type === "textarea"
						? {
								minLength: num(values.minLength),
								maxLength: num(values.maxLength),
							}
						: undefined;
		mutation.mutate({
			versionId,
			fieldId: values.fieldId,
			label: values.label,
			type: values.type,
			helpText: values.helpText || null,
			required: values.required,
			options,
			validation,
			isVisible: values.isVisible,
			editableAfterSignup: values.editableAfterSignup,
			halfWidth: values.halfWidth,
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" variant={initial ? "ghost" : "default"}>
					{initial ? <PencilIcon /> : <PlusIcon />}
					{initial ? "Editar" : "Novo campo"}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>
						{initial ? "Editar campo" : "Novo campo"}
					</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(submit)}
						className="flex flex-col gap-4"
					>
						<FormField
							control={form.control}
							name="label"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Rótulo *</FormLabel>
									<FormControl>
										<Input
											placeholder="Ex: Restrições alimentares"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="type"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Tipo *</FormLabel>
									<Select
										value={field.value}
										onValueChange={field.onChange}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="text">
												Texto curto
											</SelectItem>
											<SelectItem value="textarea">
												Texto longo
											</SelectItem>
											<SelectItem value="number">
												Número
											</SelectItem>
											<SelectItem value="date">
												Data
											</SelectItem>
											<SelectItem value="select_single">
												Seleção única
											</SelectItem>
											<SelectItem value="select_multiple">
												Múltipla seleção
											</SelectItem>
											<SelectItem value="checkbox">
												Checkbox
											</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="helpText"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Descrição de ajuda</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Texto de apoio ao participante"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						{needsOptions && (
							<FormField
								control={form.control}
								name="optionsText"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Opções (uma por linha) *
										</FormLabel>
										<FormControl>
											<Textarea
												placeholder={"Opção 1\nOpção 2"}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}
						{showNumberRange && (
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="min"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Valor mínimo</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="-"
													{...field}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="max"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Valor máximo</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="-"
													{...field}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
						)}
						{showTextLength && (
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="minLength"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Tamanho mínimo
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="-"
													{...field}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="maxLength"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Tamanho máximo
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="-"
													{...field}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
						)}
						{showPattern && (
							<FormField
								control={form.control}
								name="pattern"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Regex de validação (opcional)
										</FormLabel>
										<FormControl>
											<Input
												placeholder="^[0-9]+$"
												{...field}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
						)}
						<div className="flex flex-wrap gap-6">
							<FormField
								control={form.control}
								name="required"
								render={({ field }) => (
									<FormItem className="flex items-center gap-2 space-y-0">
										<FormControl>
											<Checkbox
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
										<FormLabel>Obrigatório</FormLabel>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="isVisible"
								render={({ field }) => (
									<FormItem className="flex items-center gap-2 space-y-0">
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
										<Label>Visível</Label>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="editableAfterSignup"
								render={({ field }) => (
									<FormItem className="flex items-center gap-2 space-y-0">
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
										<Label>Editável após inscrição</Label>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="halfWidth"
								render={({ field }) => (
									<FormItem className="flex items-center gap-2 space-y-0">
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
										<Label>Meia largura</Label>
									</FormItem>
								)}
							/>
						</div>
						{rowHint && (
							<p className="text-muted-foreground text-xs">
								{rowHint}
							</p>
						)}
						<Button type="submit" disabled={mutation.isPending}>
							{mutation.isPending
								? "Salvando..."
								: "Salvar campo"}
						</Button>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

function SortableFieldRow({
	field,
	index,
	disabled,
	actions,
	isOrphanHalf,
}: {
	field: Field;
	index: number;
	disabled: boolean;
	actions?: React.ReactNode;
	isOrphanHalf?: boolean;
}) {
	const { ref, handleRef, isDragging, isDropTarget } = useSortable({
		id: field.id,
		index,
		disabled,
		type: "form-field",
		accept: "form-field",
		transition: { duration: 200, easing: "ease-in-out" },
	});

	return (
		<div
			ref={ref}
			data-field-id={field.id}
			className={cn(
				"bg-card flex flex-col gap-3 rounded-lg border p-3 transition-all duration-200 ease-in-out will-change-transform",
				"md:flex-row md:items-center md:justify-between",
				isDragging &&
					"border-primary/60 z-10 scale-[0.99] opacity-60 shadow-lg",
				isDropTarget &&
					!isDragging &&
					"border-primary ring-primary/30 shadow-md ring-2",
			)}
		>
			<div className="flex min-w-0 flex-1 items-start gap-2">
				{!disabled && (
					<span
						ref={handleRef}
						title="Arrastar para reordenar"
						className="text-muted-foreground hover:bg-muted hover:text-foreground mt-0.5 shrink-0 cursor-grab touch-none rounded p-1 transition-colors active:cursor-grabbing"
					>
						<GripVertical className="h-5 w-5" />
					</span>
				)}
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2 font-semibold">
						<span className="truncate">{field.label}</span>
						{field.required && <Badge>Obrigatório</Badge>}
						{field.halfWidth && (
							<Badge variant="secondary">½ largura</Badge>
						)}
						{isOrphanHalf && (
							<Badge
								variant="outline"
								className="border-amber-500 text-amber-600"
							>
								½ sozinha
							</Badge>
						)}
						{!field.isVisible && (
							<Badge variant="outline">Oculto</Badge>
						)}
						{!field.isActive && (
							<Badge variant="outline">Inativo</Badge>
						)}
					</div>
					<div className="text-muted-foreground mt-1 truncate text-xs">
						{field.type}
						{field.helpText ? ` • ${field.helpText}` : ""}
						{(field.options ?? []).length > 0
							? ` • opções: ${(field.options ?? []).join(", ")}`
							: ""}
					</div>
				</div>
			</div>
			{!disabled && actions && (
				<div className="flex shrink-0 items-center gap-3 pl-9 md:pl-0">
					{actions}
				</div>
			)}
		</div>
	);
}

function AnswersPanel({ projectId }: { projectId: string }) {
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const list = trpc.listAnswers.useQuery({
		projectId,
		page,
		pageSize: 10,
		query: query || undefined,
	});
	const exp = trpc.exportAnswers.useQuery({ projectId }, { enabled: false });

	async function handleExport() {
		const result = await exp.refetch();
		if (!result.data) {
			toast.error("Falha ao exportar.");
			return;
		}
		const cols = [
			"Nome",
			"E-mail",
			"Inscrito em",
			...result.data.fields.map((f) => f.label),
		];
		const rows = result.data.rows.map((r) => [
			r.name ?? "",
			r.email ?? "",
			r.joinedAt ? new Date(r.joinedAt).toLocaleString("pt-BR") : "",
			...result.data.fields.map((f) =>
				formatAnswerValue(
					f.type as never,
					(r.answers as Record<string, unknown>)[f.key],
				),
			),
		]);
		downloadCsv(
			`respostas-${projectId.slice(0, 8)}.csv`,
			toCsv(cols, rows),
		);
		toast.success(`${rows.length} respostas exportadas!`);
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Respostas</CardTitle>
				<Button
					size="sm"
					variant="outline"
					onClick={handleExport}
					disabled={exp.isFetching}
				>
					{exp.isFetching ? "Exportando..." : "Exportar CSV"}
				</Button>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<Input
					placeholder="Buscar por nome ou e-mail..."
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setPage(1);
					}}
				/>
				{list.isPending ? (
					<Skeleton className="h-40 w-full" />
				) : !list.data || list.data.participants.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nenhuma inscrição encontrada.
					</p>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-muted-foreground text-left">
										<th className="p-2">Participante</th>
										{list.data.fields.map((f) => (
											<th key={f.id} className="p-2">
												{f.label}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{list.data.participants.map((p) => (
										<tr key={p.id} className="border-t">
											<td className="p-2">
												<div className="font-semibold">
													{p.user?.name}
												</div>
												<div className="text-muted-foreground text-xs">
													{p.user?.email}
												</div>
											</td>
											{(list.data?.fields ?? []).map(
												(f) => (
													<td
														key={f.id}
														className="max-w-[220px] truncate p-2"
													>
														{formatAnswerValue(
															f.type as never,
															(
																p.answers as Record<
																	string,
																	unknown
																>
															)[f.key],
														)}
													</td>
												),
											)}
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="flex items-center justify-between">
							<Button
								size="sm"
								variant="outline"
								disabled={page <= 1}
								onClick={() => setPage((v) => v - 1)}
							>
								Anterior
							</Button>
							<span className="text-muted-foreground text-xs">
								Página {page}
							</span>
							<Button
								size="sm"
								variant="outline"
								disabled={page >= (list.data.pageCount || 1)}
								onClick={() => setPage((v) => v + 1)}
							>
								Próxima
							</Button>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}

export function FormsContent() {
	const { projectId } = useDashboard();
	const utils = trpc.useUtils();
	const versionsQuery = trpc.listVersions.useQuery({ projectId });
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [tab, setTab] = useState<"builder" | "preview" | "answers">(
		"builder",
	);
	const [displayFields, setDisplayFields] = useState<Field[]>([]);
	const [fieldToDelete, setFieldToDelete] = useState<Field | null>(null);
	const isDraggingRef = useRef(false);
	const listRef = useRef<HTMLDivElement>(null);

	const versions: Version[] = useMemo(
		() => versionsQuery.data ?? [],
		[versionsQuery.data],
	);

	useEffect(() => {
		if (!selectedId && versions.length > 0) {
			const published =
				versions.find((v) => v.isPublished) ?? versions[0];
			if (published) setSelectedId(published.id);
		}
	}, [versions, selectedId]);

	const versionQuery = trpc.getVersion.useQuery(
		{ versionId: selectedId ?? "" },
		{ enabled: !!selectedId },
	);

	const createVersion = trpc.createVersion.useMutation({
		onSuccess: async (v) => {
			await utils.listVersions.invalidate();
			setSelectedId(v.id);
			toast.success(`Versão ${v.version} criada!`);
		},
		onError: (e) => toast.error(e.message),
	});
	const publishVersion = trpc.publishVersion.useMutation({
		onSuccess: async () => {
			await utils.listVersions.invalidate();
			await utils.getVersion.invalidate();
			await utils.getPublishedForm.invalidate();
			toast.success("Versão publicada!");
		},
		onError: (e) => toast.error(e.message),
	});
	const deleteField = trpc.deleteField.useMutation({
		onSuccess: async () => {
			await utils.getVersion.invalidate();
			await utils.listVersions.invalidate();
			setFieldToDelete(null);
			toast.success("Campo removido!");
		},
		onError: (e) => toast.error(e.message),
	});
	const reorderFields = trpc.reorderFields.useMutation({
		onSuccess: async () => {
			await utils.getVersion.invalidate();
		},
		onError: (e) => toast.error(e.message),
	});

	const serverFields: Field[] = useMemo(
		() =>
			(versionQuery.data?.fields ?? [])
				.slice()
				.sort((a, b) => a.order - b.order),
		[versionQuery.data],
	);

	useEffect(() => {
		if (!isDraggingRef.current) {
			setDisplayFields(serverFields);
		}
	}, [serverFields]);

	useEffect(() => {
		setDisplayFields([]);
	}, [selectedId]);

	const fields = displayFields;
	const selected = versions.find((v) => v.id === selectedId) ?? null;
	const isPublished = !!selected?.isPublished;
	const orphanHalfIds = useMemo(() => findOrphanHalfIds(fields), [fields]);

	function persistOrder(next: Field[]) {
		if (!selectedId) return;
		setDisplayFields(next);
		reorderFields.mutate({
			versionId: selectedId,
			orderedIds: next.map((f) => f.id),
		});
	}

	function animateFlip(container: HTMLElement | null) {
		if (!container || typeof window === "undefined") return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
			return;
		const first = new Map<string, number>();
		container
			.querySelectorAll<HTMLElement>("[data-field-id]")
			.forEach((el) => {
				const id = el.dataset.fieldId;
				if (id) first.set(id, el.getBoundingClientRect().top);
			});
		if (first.size === 0) return;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				container
					.querySelectorAll<HTMLElement>("[data-field-id]")
					.forEach((el) => {
						const id = el.dataset.fieldId;
						if (!id) return;
						const prevTop = first.get(id);
						if (prevTop === undefined) return;
						const nextTop = el.getBoundingClientRect().top;
						const dy = prevTop - nextTop;
						if (dy !== 0) {
							el.animate(
								[
									{ transform: `translateY(${dy}px)` },
									{ transform: "translateY(0)" },
								],
								{
									duration: 250,
									easing: "cubic-bezier(0.25, 1, 0.5, 1)",
								},
							);
						}
					});
			});
		});
	}

	function move(index: number, dir: -1 | 1) {
		const next = [...fields];
		const j = index + dir;
		if (j < 0 || j >= next.length) return;
		const [item] = next.splice(index, 1);
		if (!item) return;
		next.splice(j, 0, item);
		animateFlip(listRef.current);
		persistOrder(next);
	}

	if (versionsQuery.isPending) {
		return (
			<div className="container-d py-container-v min-h-screen">
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	return (
		<div className="container-d py-container-v flex min-h-screen flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-2xl font-bold">Formulário de inscrição</h1>
				<div className="flex gap-2">
					<Button
						variant={tab === "builder" ? "default" : "outline"}
						onClick={() => setTab("builder")}
					>
						<PencilRulerIcon />
						Editor
					</Button>
					<Button
						variant={tab === "preview" ? "default" : "outline"}
						onClick={() => setTab("preview")}
					>
						<Eye className="h-4 w-4" />
						Pré-visualizar
					</Button>
					<Button
						variant={tab === "answers" ? "default" : "outline"}
						onClick={() => setTab("answers")}
					>
						Respostas
					</Button>
				</div>
			</div>

			{tab === "answers" ? (
				<AnswersPanel projectId={projectId} />
			) : tab === "preview" ? (
				<FormPreview fields={fields} />
			) : (
				<>
					<Card>
						<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
							<CardTitle>Versões</CardTitle>
							<div className="flex gap-2">
								<Button
									size="sm"
									variant="outline"
									onClick={() =>
										createVersion.mutate({ projectId })
									}
									disabled={createVersion.isPending}
								>
									Nova versão
								</Button>
								{selected && (
									<Button
										size="sm"
										variant="outline"
										onClick={() =>
											createVersion.mutate({
												projectId,
												cloneFromVersionId: selected.id,
											})
										}
										disabled={createVersion.isPending}
									>
										Duplicar v{selected.version}
									</Button>
								)}
							</div>
						</CardHeader>
						<CardContent className="flex flex-wrap gap-2">
							{versions.length === 0 ? (
								<p className="text-muted-foreground text-sm">
									Nenhuma versão ainda. Crie a primeira para
									começar.
								</p>
							) : (
								versions.map((v) => (
									<Button
										key={v.id}
										size="sm"
										variant={
											v.id === selectedId
												? "default"
												: "outline"
										}
										onClick={() => setSelectedId(v.id)}
									>
										v{v.version}
										{v.isPublished &&
											v.id !== selectedId && (
												<Badge className="ml-2">
													publicada
												</Badge>
											)}
									</Button>
								))
							)}
						</CardContent>
					</Card>

					{selected && (
						<Card>
							<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
								<CardTitle>
									Campos da v{selected.version}
									{isPublished && (
										<Badge className="ml-2">
											publicada
										</Badge>
									)}
								</CardTitle>
								<div className="flex gap-2">
									{!isPublished && (
										<FieldDialog
											versionId={selected.id}
											onDone={() => undefined}
											siblings={fields}
											position={fields.length}
										/>
									)}
									{!isPublished && (
										<Button
											size="sm"
											onClick={() =>
												publishVersion.mutate({
													versionId: selected.id,
												})
											}
											disabled={
												publishVersion.isPending ||
												isPublished
											}
										>
											Publicar
										</Button>
									)}
									{isPublished && (
										<Tooltip>
											<TooltipTrigger asChild>
												<span>
													<Button
														size="sm"
														disabled={true}
													>
														Editar
													</Button>
												</span>
											</TooltipTrigger>
											<TooltipContent>
												<p>
													Para alterar o formulário
													sem
													<br />
													corromper inscrições
													existentes,
													<br />
													duplique esta versão, edite
													e
													<br />
													publique a nova.
												</p>
											</TooltipContent>
										</Tooltip>
									)}
								</div>
							</CardHeader>
							<CardContent className="flex flex-col gap-3">
								<div className="bg-muted/40 flex flex-col gap-3 rounded-lg border border-dashed p-3 md:flex-row md:items-center md:justify-between">
									<div className="flex min-w-0 flex-1 items-start gap-2">
										<span
											title="Campo fixo do sistema"
											className="text-muted-foreground mt-0.5 shrink-0 rounded p-1"
										>
											<Lock className="h-5 w-5" />
										</span>
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2 font-semibold">
												<span className="truncate">
													Nome completo
												</span>
												<Badge>Obrigatório</Badge>
												<Badge variant="outline">
													Fixo
												</Badge>
											</div>
											<div className="text-muted-foreground mt-1 truncate text-xs">
												Coletado automaticamente em toda
												inscrição
											</div>
										</div>
									</div>
								</div>
								{versionQuery.isPending ? (
									<Skeleton className="h-40 w-full" />
								) : fields.length === 0 ? (
									<p className="text-muted-foreground text-sm">
										Nenhum campo adicionado ainda.
									</p>
								) : (
									<DragDropProvider
										key={selected.id}
										onDragStart={() => {
											isDraggingRef.current = true;
										}}
										onDragEnd={(event) => {
											isDraggingRef.current = false;
											if (event.canceled) {
												setDisplayFields(serverFields);
												return;
											}
											const { source } = event.operation;
											if (isSortable(source)) {
												const { initialIndex, index } =
													source;
												if (initialIndex !== index) {
													const next = [
														...displayFields,
													];
													const [moved] = next.splice(
														initialIndex,
														1,
													);
													if (!moved) {
														setDisplayFields(
															serverFields,
														);
														return;
													}
													next.splice(
														index,
														0,
														moved,
													);
													persistOrder(next);
												}
											}
										}}
									>
										<div
											ref={listRef}
											className="flex flex-col gap-3"
										>
											{fields.map((f, i) => (
												<SortableFieldRow
													key={f.id}
													field={f}
													index={i}
													disabled={isPublished}
													isOrphanHalf={orphanHalfIds.has(
														f.id,
													)}
													actions={
														<>
															<Button
																size="sm"
																variant="outline"
																disabled={
																	i === 0
																}
																onClick={() =>
																	move(i, -1)
																}
															>
																↑
															</Button>
															<Button
																size="sm"
																variant="outline"
																disabled={
																	i ===
																	fields.length -
																		1
																}
																onClick={() =>
																	move(i, 1)
																}
															>
																↓
															</Button>
															<FieldDialog
																key={f.id}
																versionId={
																	selected.id
																}
																initial={f}
																onDone={() =>
																	undefined
																}
																siblings={
																	fields
																}
																position={i}
															/>
															<Button
																size="sm"
																variant="ghost"
																onClick={() =>
																	setFieldToDelete(
																		f,
																	)
																}
															>
																<TrashIcon />
																Excluir
															</Button>
														</>
													}
												/>
											))}
										</div>
									</DragDropProvider>
								)}
							</CardContent>
						</Card>
					)}
				</>
			)}
			<Dialog
				open={!!fieldToDelete}
				onOpenChange={(open) => {
					if (!open) setFieldToDelete(null);
				}}
			>
				<DialogContent className="sm:max-w-[440px]">
					<DialogHeader>
						<DialogTitle>Excluir campo</DialogTitle>
						<DialogDescription>
							{fieldToDelete ? (
								<>
									Tem certeza que deseja excluir o campo{" "}
									<span className="font-semibold">
										“{fieldToDelete.label}”
									</span>
									? Essa ação não pode ser desfeita.
								</>
							) : (
								"Tem certeza que deseja excluir este campo? Essa ação não pode ser desfeita."
							)}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setFieldToDelete(null)}
							disabled={deleteField.isPending}
						>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								if (fieldToDelete)
									deleteField.mutate({
										fieldId: fieldToDelete.id,
									});
							}}
							disabled={deleteField.isPending}
						>
							{deleteField.isPending
								? "Excluindo..."
								: "Excluir campo"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
