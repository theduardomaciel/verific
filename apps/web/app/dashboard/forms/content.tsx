"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@verific/zod";
import { toast } from "sonner";

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
import { formFieldTypes } from "@verific/api/schemas";
import { downloadCsv, toCsv } from "@/lib/forms/csv";
import { formatAnswerValue } from "@verific/api/schemas";
import type { RouterOutput } from "@verific/api";

type Version = RouterOutput["listVersions"][number];
type Field = RouterOutput["getVersion"]["fields"][number];

const fieldFormSchema = z.object({
	fieldId: z.string().optional(),
	label: z.string().min(1, "Obrigatório").max(200),
	type: z.enum(formFieldTypes),
	helpText: z.string().max(500).optional(),
	required: z.boolean().default(false),
	order: z.coerce.number().int().default(0),
	optionsText: z.string().optional(),
	min: z.string().optional(),
	max: z.string().optional(),
	minLength: z.string().optional(),
	maxLength: z.string().optional(),
	pattern: z.string().optional(),
	isVisible: z.boolean().default(true),
	editableAfterSignup: z.boolean().default(true),
});

type FieldFormValues = z.infer<typeof fieldFormSchema>;

function FieldDialog({
	versionId,
	initial,
	nextOrder,
	onDone,
}: {
	versionId: string;
	initial?: Field;
	nextOrder: number;
	onDone: () => void;
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
			order: initial?.order ?? nextOrder,
			optionsText: (initial?.options ?? []).join("\n"),
			min: initial?.validation?.min?.toString() ?? "",
			max: initial?.validation?.max?.toString() ?? "",
			minLength: initial?.validation?.minLength?.toString() ?? "",
			maxLength: initial?.validation?.maxLength?.toString() ?? "",
			pattern: initial?.validation?.pattern ?? "",
			isVisible: initial?.isVisible ?? true,
			editableAfterSignup: initial?.editableAfterSignup ?? true,
		} as FieldFormValues,
	});

	const watchedType = form.watch("type");
	const needsOptions = watchedType === "select_single" || watchedType === "select_multiple";
	const showNumberRange = watchedType === "number";
	const showTextLength = watchedType === "text" || watchedType === "textarea";
	const showPattern = watchedType === "text";

	function submit(values: FieldFormValues) {
		const num = (v?: string) => (v && v.trim() !== "" ? Number(v) : undefined);
		const options =
			needsOptions && values.optionsText
				? values.optionsText.split("\n").map((s) => s.trim()).filter(Boolean)
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
			order: Number(values.order) || 0,
			options,
			validation,
			isVisible: values.isVisible,
			editableAfterSignup: values.editableAfterSignup,
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" variant={initial ? "ghost" : "default"}>
					{initial ? "Editar" : "Novo campo"}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>{initial ? "Editar campo" : "Novo campo"}</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
						<FormField
							control={form.control}
							name="label"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Rótulo *</FormLabel>
									<FormControl>
										<Input placeholder="Ex: Restrições alimentares" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<FormField
								control={form.control}
								name="type"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Tipo *</FormLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="text">Texto curto</SelectItem>
												<SelectItem value="textarea">Texto longo</SelectItem>
												<SelectItem value="number">Número</SelectItem>
												<SelectItem value="date">Data</SelectItem>
												<SelectItem value="select_single">Seleção única</SelectItem>
												<SelectItem value="select_multiple">Múltipla seleção</SelectItem>
												<SelectItem value="checkbox">Checkbox</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="order"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Ordem</FormLabel>
										<FormControl>
											<Input type="number" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<FormField
							control={form.control}
							name="helpText"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Descrição de ajuda</FormLabel>
									<FormControl>
										<Textarea placeholder="Texto de apoio ao participante" {...field} />
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
										<FormLabel>Opções (uma por linha) *</FormLabel>
										<FormControl>
											<Textarea placeholder={"Opção 1\nOpção 2"} {...field} />
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
												<Input type="number" placeholder="-" {...field} />
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
												<Input type="number" placeholder="-" {...field} />
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
											<FormLabel>Tamanho mínimo</FormLabel>
											<FormControl>
												<Input type="number" placeholder="-" {...field} />
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="maxLength"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Tamanho máximo</FormLabel>
											<FormControl>
												<Input type="number" placeholder="-" {...field} />
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
										<FormLabel>Regex de validação (opcional)</FormLabel>
										<FormControl>
											<Input placeholder="^[0-9]+$" {...field} />
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
											<Checkbox checked={field.value} onCheckedChange={field.onChange} />
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
											<Switch checked={field.value} onCheckedChange={field.onChange} />
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
											<Switch checked={field.value} onCheckedChange={field.onChange} />
										</FormControl>
										<Label>Editável após inscrição</Label>
									</FormItem>
								)}
							/>
						</div>
						<Button type="submit" disabled={mutation.isPending}>
							{mutation.isPending ? "Salvando..." : "Salvar campo"}
						</Button>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

function AnswersPanel({ projectId }: { projectId: string }) {
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const list = trpc.listAnswers.useQuery({ projectId, page, pageSize: 10, query: query || undefined });
	const exp = trpc.exportAnswers.useQuery({ projectId }, { enabled: false });

	async function handleExport() {
		const result = await exp.refetch();
		if (!result.data) {
			toast.error("Falha ao exportar.");
			return;
		}
		const cols = ["Nome", "E-mail", "Inscrito em", ...result.data.fields.map((f) => f.label)];
		const rows = result.data.rows.map((r) => [
			r.name ?? "",
			r.email ?? "",
			r.joinedAt ? new Date(r.joinedAt).toLocaleString("pt-BR") : "",
			...result.data.fields.map((f) => formatAnswerValue(f.type as never, (r.answers as Record<string, unknown>)[f.key])),
		]);
		downloadCsv(`respostas-${projectId.slice(0, 8)}.csv`, toCsv(cols, rows));
		toast.success(`${rows.length} respostas exportadas!`);
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Respostas</CardTitle>
				<Button size="sm" variant="outline" onClick={handleExport} disabled={exp.isFetching}>
					{exp.isFetching ? "Exportando..." : "Exportar CSV"}
				</Button>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<Input placeholder="Buscar por nome ou e-mail..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
				{list.isPending ? (
					<Skeleton className="h-40 w-full" />
				) : !list.data || list.data.participants.length === 0 ? (
					<p className="text-muted-foreground text-sm">Nenhuma inscrição encontrada.</p>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-muted-foreground text-left">
										<th className="p-2">Participante</th>
										{list.data.fields.map((f) => (
											<th key={f.id} className="p-2">{f.label}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{list.data.participants.map((p) => (
										<tr key={p.id} className="border-t">
											<td className="p-2">
												<div className="font-semibold">{p.user?.name}</div>
												<div className="text-muted-foreground text-xs">{p.user?.email}</div>
											</td>
											{(list.data?.fields ?? []).map((f) => (
												<td key={f.id} className="max-w-[220px] truncate p-2">
													{formatAnswerValue(f.type as never, (p.answers as Record<string, unknown>)[f.key])}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="flex items-center justify-between">
							<Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>
								Anterior
							</Button>
							<span className="text-muted-foreground text-xs">Página {page}</span>
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
	const [tab, setTab] = useState<"builder" | "answers">("builder");

	const versions: Version[] = useMemo(() => versionsQuery.data ?? [], [versionsQuery.data]);

	useEffect(() => {
		if (!selectedId && versions.length > 0) {
			const published = versions.find((v) => v.isPublished) ?? versions[0];
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

	if (versionsQuery.isPending) {
		return (
			<div className="container-d py-container-v min-h-screen">
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	const selected = versions.find((v) => v.id === selectedId) ?? null;
	const fields: Field[] = (versionQuery.data?.fields ?? []).slice().sort((a, b) => a.order - b.order);
	const isPublished = !!selected?.isPublished;

	function move(index: number, dir: -1 | 1) {
		if (!selectedId) return;
		const next = [...fields];
		const j = index + dir;
		if (j < 0 || j >= next.length) return;
		const [item] = next.splice(index, 1);
		next.splice(j, 0, item!);
		reorderFields.mutate({ versionId: selectedId, orderedIds: next.map((f) => f.id) });
	}

	return (
		<div className="container-d py-container-v flex min-h-screen flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-2xl font-bold">Formulário de inscrição</h1>
				<div className="flex gap-2">
					<Button size="sm" variant={tab === "builder" ? "default" : "outline"} onClick={() => setTab("builder")}>
						Construtor
					</Button>
					<Button size="sm" variant={tab === "answers" ? "default" : "outline"} onClick={() => setTab("answers")}>
						Respostas
					</Button>
				</div>
			</div>

			{tab === "answers" ? (
				<AnswersPanel projectId={projectId} />
			) : (
				<>
					<Card>
						<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
							<CardTitle>Versões</CardTitle>
							<div className="flex gap-2">
								<Button
									size="sm"
									variant="outline"
									onClick={() => createVersion.mutate({ projectId })}
									disabled={createVersion.isPending}
								>
									Nova versão
								</Button>
								{selected && (
									<Button
										size="sm"
										variant="outline"
										onClick={() => createVersion.mutate({ projectId, cloneFromVersionId: selected.id })}
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
									Nenhuma versão ainda. Crie a primeira para começar.
								</p>
							) : (
								versions.map((v) => (
									<Button
										key={v.id}
										size="sm"
										variant={v.id === selectedId ? "default" : "outline"}
										onClick={() => setSelectedId(v.id)}
									>
										v{v.version} ({v.fieldsCount})
										{v.isPublished && <Badge className="ml-2">publicada</Badge>}
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
									{isPublished && <Badge className="ml-2">publicada (imutável)</Badge>}
								</CardTitle>
								<div className="flex gap-2">
									{!isPublished && (
										<FieldDialog
											versionId={selected.id}
											nextOrder={fields.length}
											onDone={() => undefined}
										/>
									)}
									{!isPublished && (
										<Button size="sm" onClick={() => publishVersion.mutate({ versionId: selected.id })} disabled={publishVersion.isPending}>
											Publicar
										</Button>
									)}
								</div>
							</CardHeader>
							<CardContent className="flex flex-col gap-3">
								{versionQuery.isPending ? (
									<Skeleton className="h-40 w-full" />
								) : fields.length === 0 ? (
									<p className="text-muted-foreground text-sm">Nenhum campo. Adicione o primeiro campo acima.</p>
								) : (
									fields.map((f, i) => (
										<div key={f.id} className="flex flex-col gap-1 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
											<div>
												<div className="flex items-center gap-2 font-semibold">
													{f.label}
													{f.required && <Badge>Obrigatório</Badge>}
													{!f.isVisible && <Badge variant="outline">Oculto</Badge>}
													{!f.isActive && <Badge variant="outline">Inativo</Badge>}
												</div>
												<div className="text-muted-foreground text-xs">
													{f.type} • ordem {f.order}
													{f.helpText ? ` • ${f.helpText}` : ""}
													{(f.options ?? []).length > 0 ? ` • opções: ${(f.options ?? []).join(", ")}` : ""}
												</div>
											</div>
											{!isPublished && (
												<div className="flex gap-1">
													<Button size="sm" variant="outline" disabled={i === 0} onClick={() => move(i, -1)}>
														↑
													</Button>
													<Button size="sm" variant="outline" disabled={i === fields.length - 1} onClick={() => move(i, 1)}>
														↓
													</Button>
													<FieldDialog versionId={selected.id} initial={f} nextOrder={f.order} onDone={() => undefined} />
													<Button size="sm" variant="ghost" onClick={() => deleteField.mutate({ fieldId: f.id })}>
														Excluir
													</Button>
												</div>
											)}
										</div>
									))
								)}
								{isPublished && (
									<p className="text-muted-foreground text-xs">
										Para alterar o formulário sem corromper inscrições existentes, duplique esta versão, edite e publique a nova.
									</p>
								)}
							</CardContent>
						</Card>
					)}
				</>
			)}
		</div>
	);
}
