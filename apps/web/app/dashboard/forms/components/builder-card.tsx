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
import type { Field, Section, Version } from "../types";
import type { UseFormsBuilder } from "../hooks/use-forms-builder";
import { FieldDialog } from "./field-dialog";
import { SectionDialog } from "./section-dialog";
import { SortableFieldRow } from "./field-row";

interface BuilderCardProps {
	selected: Version | null;
	isPublished: boolean;
	fields: Field[];
	sections: Section[];
	isLoadingFields: boolean;
	orphanHalfIds: Set<string>;
	listRef: RefObject<HTMLDivElement | null>;
	isDraggingRef: RefObject<boolean>;
	isPublishing: boolean;
	upsertSection: UseFormsBuilder["upsertSection"];
	onPublish: () => void;
	onPersistOrder: (next: Field[], sectionIdByField?: Record<string, string | null>) => void;
	onRevertOrder: () => void;
	onMove: (index: number, dir: -1 | 1) => void;
	onMoveSection: (index: number, dir: -1 | 1) => void;
	onDelete: (field: Field) => void;
	onDeleteSection: (section: Section) => void;
}

export function BuilderCard({
	selected,
	isPublished,
	fields,
	sections,
	isLoadingFields,
	orphanHalfIds,
	listRef,
	isDraggingRef,
	isPublishing,
	upsertSection,
	onPublish,
	onPersistOrder,
	onRevertOrder,
	onMove,
	onMoveSection,
	onDelete,
	onDeleteSection,
}: BuilderCardProps) {
	if (!selected) return null;

	const sortedSections = [...sections].sort((a, b) => a.order - b.order);
	const fieldsBySection = new Map<string, Field[]>();
	const ungrouped: Field[] = [];
	for (const f of [...fields].sort((a, b) => a.order - b.order)) {
		if (f.sectionId && sortedSections.some((s) => s.id === f.sectionId)) {
			if (!fieldsBySection.has(f.sectionId)) fieldsBySection.set(f.sectionId, []);
			fieldsBySection.get(f.sectionId)!.push(f);
		} else {
			ungrouped.push(f);
		}
	}

	function moveWithinSection(sectionId: string, fieldIndex: number, dir: -1 | 1) {
		const list = fieldsBySection.get(sectionId) ?? [];
		const j = fieldIndex + dir;
		if (j < 0 || j >= list.length) return;
		const nextList = [...list];
		const [item] = nextList.splice(fieldIndex, 1);
		if (!item) return;
		nextList.splice(j, 0, item);
		// Rebuild the flat order: keep section order, replace this section's slice.
		const next: Field[] = [];
		for (const s of sortedSections) {
			if (s.id === sectionId) next.push(...nextList);
			else next.push(...(fieldsBySection.get(s.id) ?? []));
		}
		next.push(...ungrouped);
		onPersistOrder(next);
	}

	return (
		<Card>
			<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
				<CardTitle>
					Campos da v{selected.version}
					{isPublished && <Badge className="ml-2">publicada</Badge>}
				</CardTitle>
				<div className="flex flex-wrap gap-2">
					{!isPublished && (
						<SectionDialog versionId={selected.id} upsertSection={upsertSection} />
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
				) : sortedSections.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nenhuma seção ainda. Crie a primeira seção para começar.
					</p>
				) : (
					<div ref={listRef} className="flex flex-col gap-4">
						{sortedSections.map((section, si) => {
							const sectionFields = fieldsBySection.get(section.id) ?? [];
							return (
								<div key={section.id} className="flex flex-col gap-2 rounded-lg border p-3">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="flex min-w-0 flex-wrap items-center gap-2">
											<span className="font-bold">
												{si + 1}. {section.title}
											</span>
											<Badge variant="secondary">
												{sectionFields.length} campo{sectionFields.length === 1 ? "" : "s"}
											</Badge>
										</div>
										{!isPublished && (
											<div className="flex flex-wrap items-center gap-2">
												<Button
													size="sm"
													variant="outline"
													disabled={si === 0}
													onClick={() => onMoveSection(si, -1)}
												>
													↑
												</Button>
												<Button
													size="sm"
													variant="outline"
													disabled={si === sortedSections.length - 1}
													onClick={() => onMoveSection(si, 1)}
												>
													↓
												</Button>
												<SectionDialog
													versionId={selected.id}
													initial={section}
													upsertSection={upsertSection}
												/>
												<FieldDialog
													versionId={selected.id}
													onDone={() => undefined}
													siblings={fields}
													position={fields.length}
													sections={sortedSections}
													defaultSectionId={section.id}
												/>
												<Button
													size="sm"
													variant="ghost"
													onClick={() => onDeleteSection(section)}
												>
													<TrashIcon />
													Excluir seção
												</Button>
											</div>
										)}
									</div>
									{sectionFields.length === 0 ? (
										<p className="text-muted-foreground text-sm">
											Nenhum campo nesta seção ainda.
										</p>
									) : (
										<DragDropProvider
											key={`${selected.id}-${section.id}`}
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
														const nextList = [...sectionFields];
														const [moved] = nextList.splice(initialIndex, 1);
														if (!moved) {
															onRevertOrder();
															return;
														}
														nextList.splice(index, 0, moved);
														const next: Field[] = [];
														for (const s of sortedSections) {
															if (s.id === section.id) next.push(...nextList);
															else next.push(...(fieldsBySection.get(s.id) ?? []));
														}
														next.push(...ungrouped);
														onPersistOrder(next);
													}
												}
											}}
										>
											<div className="flex flex-col gap-3">
												{sectionFields.map((f, i) => {
													const globalIndex = fields.findIndex((gf) => gf.id === f.id);
													return (
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
																		onClick={() => moveWithinSection(section.id, i, -1)}
																	>
																		↑
																	</Button>
																	<Button
																		size="sm"
																		variant="outline"
																		disabled={i === sectionFields.length - 1}
																		onClick={() => moveWithinSection(section.id, i, 1)}
																	>
																		↓
																	</Button>
																	<FieldDialog
																		key={f.id}
																		versionId={selected.id}
																		initial={f}
																		onDone={() => undefined}
																		siblings={fields}
																		position={globalIndex}
																		sections={sortedSections}
																		defaultSectionId={section.id}
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
													);
												})}
											</div>
										</DragDropProvider>
									)}
								</div>
							);
						})}
						{ungrouped.length > 0 && (
							<div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
								<div className="flex flex-wrap items-center gap-2">
									<span className="font-bold">Sem seção</span>
									<Badge variant="outline">{ungrouped.length}</Badge>
								</div>
								<p className="text-muted-foreground text-xs">
									Edite cada campo para atribuí-lo a uma seção.
								</p>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
