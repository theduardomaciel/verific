"use client";

import type { RefObject } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { Lock, TrashIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Field, Version } from "../types";
import { FieldDialog } from "./field-dialog";
import { SortableFieldRow } from "./field-row";

interface BuilderCardProps {
	selected: Version | null;
	isPublished: boolean;
	fields: Field[];
	isLoadingFields: boolean;
	orphanHalfIds: Set<string>;
	listRef: RefObject<HTMLDivElement | null>;
	isDraggingRef: RefObject<boolean>;
	isPublishing: boolean;
	onPublish: () => void;
	onPersistOrder: (next: Field[]) => void;
	onRevertOrder: () => void;
	onMove: (index: number, dir: -1 | 1) => void;
	onDelete: (field: Field) => void;
}

export function BuilderCard({
	selected,
	isPublished,
	fields,
	isLoadingFields,
	orphanHalfIds,
	listRef,
	isDraggingRef,
	isPublishing,
	onPublish,
	onPersistOrder,
	onRevertOrder,
	onMove,
	onDelete,
}: BuilderCardProps) {
	if (!selected) return null;

	return (
		<Card>
			<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
				<CardTitle>
					Campos da v{selected.version}
					{isPublished && <Badge className="ml-2">publicada</Badge>}
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
							onClick={onPublish}
							disabled={isPublishing || isPublished}
						>
							Publicar
						</Button>
					)}
					{isPublished && (
						<Tooltip>
							<TooltipTrigger asChild>
								<span>
									<Button size="sm" disabled={true}>
										Editar
									</Button>
								</span>
							</TooltipTrigger>
							<TooltipContent>
								<p>
									Para alterar o formulário sem
									<br />
									corromper inscrições existentes,
									<br />
									duplique esta versão, edite e<br />
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
								<span className="truncate">Nome completo</span>
								<Badge>Obrigatório</Badge>
								<Badge variant="outline">Fixo</Badge>
							</div>
							<div className="text-muted-foreground mt-1 truncate text-xs">
								Coletado automaticamente em toda inscrição
							</div>
						</div>
					</div>
				</div>
				{isLoadingFields ? (
					<div className="flex flex-col gap-3" aria-busy="true">
						<div className="flex flex-col gap-2 rounded-lg border p-3">
							<Skeleton className="h-5 w-2/5" />
							<Skeleton className="h-4 w-1/3" />
						</div>
						<div className="flex flex-col gap-2 rounded-lg border p-3">
							<Skeleton className="h-5 w-1/2" />
							<Skeleton className="h-4 w-1/4" />
						</div>
						<div className="flex flex-col gap-2 rounded-lg border p-3">
							<Skeleton className="h-5 w-1/3" />
							<Skeleton className="h-4 w-1/2" />
						</div>
					</div>
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
								onRevertOrder();
								return;
							}
							const { source } = event.operation;
							if (isSortable(source)) {
								const { initialIndex, index } = source;
								if (initialIndex !== index) {
									const next = [...fields];
									const [moved] = next.splice(
										initialIndex,
										1,
									);
									if (!moved) {
										onRevertOrder();
										return;
									}
									next.splice(index, 0, moved);
									onPersistOrder(next);
								}
							}
						}}
					>
						<div ref={listRef} className="flex flex-col gap-3">
							{fields.map((f, i) => (
								<SortableFieldRow
									key={f.id}
									field={f}
									index={i}
									disabled={isPublished}
									isOrphanHalf={orphanHalfIds.has(f.id)}
									actions={
										<>
											<Button
												size="sm"
												variant="outline"
												disabled={i === 0}
												onClick={() => onMove(i, -1)}
											>
												↑
											</Button>
											<Button
												size="sm"
												variant="outline"
												disabled={
													i === fields.length - 1
												}
												onClick={() => onMove(i, 1)}
											>
												↓
											</Button>
											<FieldDialog
												key={f.id}
												versionId={selected.id}
												initial={f}
												onDone={() => undefined}
												siblings={fields}
												position={i}
											/>
											<Button
												size="sm"
												variant="ghost"
												onClick={() => onDelete(f)}
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
	);
}
