"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
	ArrowDown,
	ArrowUp,
	Plus,
	RotateCcw,
	Save,
	Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { StatIcon } from "@/components/profile/stat-icons";
import { trpc } from "@/lib/trpc/react";
import { revalidateEventProfiles } from "@/lib/profile-actions";
import { formFieldTypeLabels } from "@verific/drizzle/enum/form-field-type";
import {
	PROFILE_SLOTS,
	profileLayoutSchema,
	STAT_ICON_KEYS,
	STAT_ICON_LABELS,
	type ProfileLayout,
	type ProfileSlotKey,
	type StatIconKey,
} from "@verific/drizzle/profile-layout";

interface FieldOption {
	id: string;
	label: string;
	type: string;
	required: boolean;
}

interface ProfileLayoutEditorProps {
	projectId: string;
	projectUrl: string;
	initial: ProfileLayout;
}

const NONE = "__none__";

const SLOT_META: Record<
	ProfileSlotKey,
	{ title: string; description: string }
> = {
	subtitle: {
		title: "Subtítulo (sob o nome)",
		description: "Um campo de texto curto.",
	},
	bio: {
		title: "Bio",
		description: "Um campo de texto longo ou curto.",
	},
	stats: {
		title: "Cartão de stats",
		description: "Até 5 itens (campo + rótulo + ícone). Some quando vazio.",
	},
	socials: {
		title: "Redes sociais",
		description: "Um campo do tipo Links sociais.",
	},
	email: {
		title: "E-mail público",
		description: "Um campo de e-mail escolhido pelo participante.",
	},
};

function compatibleFields(
	fields: FieldOption[],
	slot: ProfileSlotKey,
): FieldOption[] {
	const accepts = PROFILE_SLOTS[slot].accepts as readonly string[];
	return fields.filter((f) => accepts.includes(f.type));
}

function neededTypesLabel(slot: ProfileSlotKey): string {
	const accepts = PROFILE_SLOTS[slot].accepts as readonly string[];
	return accepts
		.map((t) => formFieldTypeLabels[t as keyof typeof formFieldTypeLabels])
		.join(" ou ");
}

export function ProfileLayoutEditor({
	projectId,
	projectUrl,
	initial,
}: ProfileLayoutEditorProps) {
	const [draft, setDraft] = useState<ProfileLayout>(initial);
	const utils = trpc.useUtils();
	const optionsQuery = trpc.getProfileFieldOptions.useQuery({ projectId });
	const saveMutation = trpc.updateProfileLayout.useMutation();

	const fields: FieldOption[] = useMemo(
		() => optionsQuery.data?.fields ?? [],
		[optionsQuery.data],
	);
	const version = optionsQuery.data?.version;

	const dirty = useMemo(
		() => JSON.stringify(draft) !== JSON.stringify(initial),
		[draft, initial],
	);

	function patch(p: Partial<ProfileLayout>) {
		setDraft((d) => ({ ...d, ...p }));
	}

	function setSingle(
		key:
			| "subtitleFieldId"
			| "bioFieldId"
			| "socialsFieldId"
			| "emailFieldId",
		fieldId: string | null,
	) {
		patch({ [key]: fieldId } as Partial<ProfileLayout>);
	}

	function addStat() {
		if (draft.stats.length >= 5) return;
		const first = compatibleFields(fields, "stats").find(
			(f) => !draft.stats.some((s) => s.fieldId === f.id),
		);
		if (!first) return;
		patch({
			stats: [
				...draft.stats,
				{
					fieldId: first.id,
					label: first.label,
					icon: "star" as StatIconKey,
				},
			],
		});
	}

	function setStat(index: number, s: (typeof draft.stats)[number]) {
		patch({ stats: draft.stats.map((cur, i) => (i === index ? s : cur)) });
	}

	function moveStat(index: number, dir: -1 | 1) {
		const j = index + dir;
		if (j < 0 || j >= draft.stats.length) return;
		const next = [...draft.stats];
		const [item] = next.splice(index, 1);
		next.splice(j, 0, item!);
		patch({ stats: next });
	}

	function removeStat(index: number) {
		patch({ stats: draft.stats.filter((_, i) => i !== index) });
	}

	async function onSave() {
		const parsed = profileLayoutSchema.safeParse(draft);
		if (!parsed.success) {
			toast.error("Layout inválido. Revise os campos.");
			return;
		}
		try {
			await saveMutation.mutateAsync({ projectId, layout: parsed.data });
			await revalidateEventProfiles(projectUrl);
			void utils.getProject.invalidate();
			toast.success("Layout do perfil aplicado!");
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Erro ao salvar layout.",
			);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h2 className="text-xl font-bold">Layout do perfil</h2>
					<p className="text-muted-foreground text-sm">
						Ligue campos do formulário aos blocos fixos do perfil.{" "}
						{version
							? `Campos da v${version.version} (${version.isPublished ? "publicada" : "rascunho"}).`
							: "Sem versões de formulário ainda."}
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={!dirty}
						onClick={() => setDraft(initial)}
					>
						<RotateCcw className="mr-2 h-4 w-4" />
						Descartar
					</Button>
					<Button
						size="sm"
						disabled={!dirty || saveMutation.isPending}
						onClick={() => void onSave()}
					>
						<Save className="mr-2 h-4 w-4" />
						{saveMutation.isPending ? "Salvando…" : "Salvar layout"}
					</Button>
				</div>
			</div>

			{(["subtitle", "bio", "socials", "email"] as const).map((slot) => (
				<SingleSlotCard
					key={slot}
					slot={slot}
					draft={draft}
					fields={fields}
					loading={optionsQuery.isPending}
					onPick={(fieldId) =>
						setSingle(
							`${slot}FieldId` as
								| "subtitleFieldId"
								| "bioFieldId"
								| "socialsFieldId"
								| "emailFieldId",
							fieldId,
						)
					}
				/>
			))}

			<Card>
				<CardHeader>
					<CardTitle>{SLOT_META.stats.title}</CardTitle>
					<p className="text-muted-foreground text-sm">
						{SLOT_META.stats.description}
					</p>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					{draft.stats.map((item, i) => (
						<StatRow
							key={`${item.fieldId}-${i}`}
							item={item}
							index={i}
							total={draft.stats.length}
							fields={compatibleFields(fields, "stats")}
							onChange={(s) => setStat(i, s)}
							onMove={(dir) => moveStat(i, dir)}
							onRemove={() => removeStat(i)}
						/>
					))}
					{draft.stats.length === 0 && (
						<p className="text-muted-foreground text-sm">
							Nenhum item — o cartão some do perfil.
						</p>
					)}
					<div>
						<Button
							size="sm"
							variant="outline"
							disabled={
								draft.stats.length >= 5 ||
								compatibleFields(fields, "stats").length === 0
							}
							onClick={addStat}
						>
							<Plus className="mr-2 h-4 w-4" />
							Adicionar item
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Módulos</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex items-center justify-between gap-2">
						<div className="flex flex-col">
							<Label>Painel de conexões</Label>
							<span className="text-muted-foreground text-xs">
								Desligado some por completo, sem espaço vazio.
							</span>
						</div>
						<Switch
							checked={draft.connectionsEnabled}
							onCheckedChange={(connectionsEnabled) =>
								patch({ connectionsEnabled })
							}
						/>
					</div>
					<div className="flex items-center justify-between gap-2 opacity-60">
						<div className="flex flex-col">
							<Label>
								Adesivos{" "}
								<Badge variant="outline">Em breve</Badge>
							</Label>
							<span className="text-muted-foreground text-xs">
								Só o flag é salvo; ainda não renderiza nada.
							</span>
						</div>
						<Switch
							checked={draft.badgesEnabled}
							disabled
							onCheckedChange={(badgesEnabled) =>
								patch({ badgesEnabled })
							}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function SingleSlotCard({
	slot,
	draft,
	fields,
	loading,
	onPick,
}: {
	slot: "subtitle" | "bio" | "socials" | "email";
	draft: ProfileLayout;
	fields: FieldOption[];
	loading: boolean;
	onPick: (fieldId: string | null) => void;
}) {
	const key = `${slot}FieldId` as const;
	const current: string | null = draft[key] ?? null;
	const compatible = fields.filter((f) =>
		(PROFILE_SLOTS[slot].accepts as readonly string[]).includes(f.type),
	);
	const currentMissing =
		current !== null && !fields.some((f) => f.id === current);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{SLOT_META[slot].title}</CardTitle>
				<p className="text-muted-foreground text-sm">
					{SLOT_META[slot].description}
				</p>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				<Select
					value={current ?? NONE}
					onValueChange={(v) => onPick(v === NONE ? null : v)}
					disabled={loading}
				>
					<SelectTrigger>
						<SelectValue placeholder="Selecionar campo" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={NONE}>Nenhum</SelectItem>
						{compatible.map((f) => (
							<SelectItem key={f.id} value={f.id}>
								{f.label}
								{f.required ? " (obrigatório)" : ""}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{currentMissing && (
					<p className="text-destructive text-xs">
						O campo ligado não existe mais nesta versão — escolha
						outro.
					</p>
				)}
				{!loading && compatible.length === 0 && (
					<p className="text-muted-foreground text-xs">
						Nenhum campo compatível no formulário. Crie um campo do
						tipo “{neededTypesLabel(slot)}”.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

function StatRow({
	item,
	index,
	total,
	fields,
	onChange,
	onMove,
	onRemove,
}: {
	item: { fieldId: string; label: string; icon: StatIconKey };
	index: number;
	total: number;
	fields: FieldOption[];
	onChange: (s: {
		fieldId: string;
		label: string;
		icon: StatIconKey;
	}) => void;
	onMove: (dir: -1 | 1) => void;
	onRemove: () => void;
}) {
	const missing = !fields.some((f) => f.id === item.fieldId);
	return (
		<div className="flex flex-col gap-2 rounded-lg border p-3">
			<div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
				<div className="flex items-center gap-2">
					<StatIcon icon={item.icon} size={20} />
					<Select
						value={
							fields.some((f) => f.id === item.fieldId)
								? item.fieldId
								: ""
						}
						onValueChange={(fieldId) => {
							const f = fields.find((x) => x.id === fieldId);
							onChange({
								...item,
								fieldId,
								label: item.label || f?.label || "",
							});
						}}
					>
						<SelectTrigger>
							<SelectValue placeholder="Campo" />
						</SelectTrigger>
						<SelectContent>
							{fields.map((f) => (
								<SelectItem key={f.id} value={f.id}>
									{f.label}
									{f.required ? " (obrigatório)" : ""}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<Input
					value={item.label}
					placeholder="Rótulo"
					onChange={(e) =>
						onChange({ ...item, label: e.target.value })
					}
				/>
				<div className="flex items-center gap-1">
					<Button
						size="sm"
						variant="outline"
						disabled={index === 0}
						onClick={() => onMove(-1)}
						aria-label="Mover para cima"
					>
						<ArrowUp className="h-4 w-4" />
					</Button>
					<Button
						size="sm"
						variant="outline"
						disabled={index === total - 1}
						onClick={() => onMove(1)}
						aria-label="Mover para baixo"
					>
						<ArrowDown className="h-4 w-4" />
					</Button>
					<Button
						size="sm"
						variant="ghost"
						onClick={onRemove}
						aria-label="Remover"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>
			{missing && (
				<p className="text-destructive text-xs">
					O campo ligado não existe mais nesta versão — escolha outro.
				</p>
			)}
			<div className="flex items-center gap-2">
				<Label className="text-xs">Ícone</Label>
				<Select
					value={item.icon}
					onValueChange={(v) =>
						onChange({ ...item, icon: v as StatIconKey })
					}
				>
					<SelectTrigger className="w-48">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{STAT_ICON_KEYS.map((key) => (
							<SelectItem key={key} value={key}>
								<span className="flex items-center gap-2">
									<StatIcon icon={key} size={16} />
									{STAT_ICON_LABELS[key]}
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
