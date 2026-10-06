"use client";

import { FilePlusIcon, CopyIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	ConfirmDialog,
	useConfirmDialog,
} from "@/components/ui/confirm-dialog";
import type { Version } from "../types";
import type { ReactNode } from "react";

interface VersionsCardProps {
	versions: Version[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	onCreate: () => void;
	onDuplicate: (version: Version) => void;
	onDelete: (version: Version) => void;
	isCreating: boolean;
	isDeleting: boolean;
	actions?: ReactNode;
}

export function VersionsCard({
	versions,
	selectedId,
	onSelect,
	onCreate,
	onDuplicate,
	onDelete,
	isCreating,
	isDeleting,
	actions,
}: VersionsCardProps) {
	const selected = versions.find((v) => v.id === selectedId) ?? null;
	const { confirm, dialogProps } = useConfirmDialog();
	const isBusy = isCreating || isDeleting;

	async function handleCreate() {
		const ok = await confirm({
			title: "Criar nova versão?",
			description:
				"Uma nova versão vazia será criada a partir da versão atual. Deseja continuar?",
			confirmLabel: "Criar versão",
		});
		if (ok) onCreate();
	}

	async function handleDuplicate() {
		if (!selected) return;
		const ok = await confirm({
			title: `Duplicar v${selected.version}?`,
			description: `Uma cópia da v${selected.version} com todos os campos será criada como uma nova versão. Deseja continuar?`,
			confirmLabel: "Duplicar versão",
		});
		if (ok) onDuplicate(selected);
	}

	async function handleDelete() {
		if (!selected || selected.isPublished) return;
		const ok = await confirm({
			title: `Excluir v${selected.version}?`,
			description: `A v${selected.version} e todos os seus campos serão removidos permanentemente. Essa ação não pode ser desfeita.`,
			confirmLabel: "Excluir versão",
			confirmVariant: "destructive",
		});
		if (ok) onDelete(selected);
	}

	return (
		<Card>
			<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
				<CardTitle>Versões</CardTitle>
				<div className="flex gap-2">
					<Button
						size="sm"
						variant="outline"
						onClick={() => void handleCreate()}
						disabled={isBusy}
					>
						<FilePlusIcon />
						Nova versão
					</Button>
					{selected && (
						<Button
							size="sm"
							variant="outline"
							onClick={() => void handleDuplicate()}
							disabled={isBusy}
						>
							<CopyIcon />
							Duplicar v{selected.version}
						</Button>
					)}
					{selected && !selected.isPublished && (
						<Button
							size="sm"
							variant="outline"
							onClick={() => void handleDelete()}
							disabled={isBusy}
						>
							<TrashIcon />
							Excluir
						</Button>
					)}
					{actions}
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
							variant={
								v.id === selectedId ? "default" : "outline"
							}
							onClick={() => onSelect(v.id)}
						>
							v{v.version}
							{v.isPublished && v.id !== selectedId && (
								<Badge className="ml-2">publicada</Badge>
							)}
						</Button>
					))
				)}
			</CardContent>
			<ConfirmDialog {...dialogProps} />
		</Card>
	);
}
