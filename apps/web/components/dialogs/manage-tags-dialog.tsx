"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, TagsIcon, Trash2, X } from "lucide-react";

import { trpc } from "@/lib/trpc/react";
import { tagColors } from "@verific/api/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

interface ManageTagsDialogProps {
	projectId: string;
}

export function ManageTagsDialog({ projectId }: ManageTagsDialogProps) {
	const [open, setOpen] = useState(false);
	const [newName, setNewName] = useState("");
	const [newColor, setNewColor] = useState<string>(tagColors[1]!);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingName, setEditingName] = useState("");

	const utils = trpc.useUtils();
	const { data: tags, isPending } = trpc.getProjectTags.useQuery(
		{ projectId },
		{ enabled: open },
	);
	const createTag = trpc.createTag.useMutation();
	const renameTag = trpc.renameTag.useMutation();
	const deleteTag = trpc.deleteTag.useMutation();

	const invalidate = () => utils.getProjectTags.invalidate({ projectId });

	const handleCreate = async () => {
		const name = newName.trim();
		if (!name) return;
		try {
			await createTag.mutateAsync({
				projectId,
				name,
				color: newColor as (typeof tagColors)[number],
			});
			setNewName("");
			await invalidate();
			toast.success("Trilha criada!");
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Erro ao criar trilha.",
			);
		}
	};

	const handleRename = async (tagId: string) => {
		const name = editingName.trim();
		if (!name) return;
		try {
			await renameTag.mutateAsync({ tagId, name });
			setEditingId(null);
			await invalidate();
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Erro ao renomear trilha.",
			);
		}
	};

	const handleDelete = async (tagId: string) => {
		try {
			await deleteTag.mutateAsync({ tagId });
			await invalidate();
			toast.success("Trilha excluída.");
		} catch {
			toast.error("Erro ao excluir trilha.");
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="lg" className="w-full">
					<TagsIcon className="mr-2 h-4 w-4" />
					Gerenciar trilhas
				</Button>
			</DialogTrigger>
			<DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>Trilhas do evento</DialogTitle>
					<DialogDescription>
						Organize as atividades em trilhas como Hardware e
						Software. Excluir uma trilha apenas a remove das
						atividades.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-2 overflow-y-auto">
					{isPending ? (
						<p className="text-muted-foreground text-sm">
							Carregando...
						</p>
					) : (tags ?? []).length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Nenhuma trilha criada ainda.
						</p>
					) : (
						tags!.map((tag) =>
							editingId === tag.id ? (
								<div
									key={tag.id}
									className="flex items-center gap-2"
								>
									<Input
										value={editingName}
										maxLength={30}
										onChange={(e) =>
											setEditingName(e.target.value)
										}
										onKeyDown={(e) => {
											if (e.key === "Enter")
												void handleRename(tag.id);
										}}
									/>
									<Button
										size="sm"
										disabled={
											!editingName.trim() ||
											renameTag.isPending
										}
										onClick={() =>
											void handleRename(tag.id)
										}
									>
										Salvar
									</Button>
									<Button
										size="icon"
										variant="ghost"
										onClick={() => setEditingId(null)}
									>
										<X size={16} />
									</Button>
								</div>
							) : (
								<div
									key={tag.id}
									className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
								>
									<span className="flex min-w-0 items-center gap-2 text-sm font-medium">
										<span
											className="h-3 w-3 shrink-0 rounded-full"
											style={{
												backgroundColor: tag.color,
											}}
										/>
										<span className="truncate">
											{tag.name}
										</span>
									</span>
									<span className="flex shrink-0 gap-1">
										<Button
											size="icon"
											variant="ghost"
											className="h-8 w-8"
											onClick={() => {
												setEditingId(tag.id);
												setEditingName(tag.name);
											}}
										>
											<Pencil size={14} />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											className="h-8 w-8"
											disabled={deleteTag.isPending}
											onClick={() =>
												void handleDelete(tag.id)
											}
										>
											<Trash2 size={14} />
										</Button>
									</span>
								</div>
							),
						)
					)}
				</div>

				<div className="flex flex-col gap-2 border-t pt-4">
					<div className="flex gap-2">
						<Input
							placeholder="Nova trilha (ex.: Hardware)"
							value={newName}
							maxLength={30}
							onChange={(e) => setNewName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") void handleCreate();
							}}
						/>
						<Button
							type="button"
							disabled={!newName.trim() || createTag.isPending}
							onClick={() => void handleCreate()}
						>
							<Plus size={16} />
							Criar
						</Button>
					</div>
					<div className="flex flex-wrap gap-1.5">
						{tagColors.map((color) => (
							<button
								key={color}
								type="button"
								// oxlint-disable-next-line jsx-a11y/control-has-associated-label -- `title={color}` IS an accessible label (ATs announce it on focus); linter only checks for <label> or aria-label.
								title={color}
								onClick={() => setNewColor(color)}
								className={`h-6 w-6 rounded-full border-2 transition-transform ${
									newColor === color
										? "border-foreground scale-110"
										: "border-transparent"
								}`}
								style={{ backgroundColor: color }}
							/>
						))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
