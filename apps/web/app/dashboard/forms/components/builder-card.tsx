"use client";

import type { ReactNode, RefObject } from "react";
import { DragDropProvider, useDroppable } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Lock, TrashIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Field, Section, Version } from "../types";
import type { UseFormsBuilder } from "../hooks/use-forms-builder";
import { FieldDialog } from "./field-dialog";
import { SectionDialog } from "./section-dialog";
import { SortableFieldRow } from "./field-row";

const SECTIONS_GROUP = "__sections";
const UNGROUPED = "__ungrouped";
const SECTION_PREFIX = "section:";
const FIELD_DROP_PREFIX = "field-drop:";

function sectionSortId(sectionId: string) {
	return `${SECTION_PREFIX}${sectionId}`;
}

function fieldDropId(sectionId: string) {
	return `${FIELD_DROP_PREFIX}${sectionId}`;
}

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
	onPersistSectionOrder: (next: Section[]) => void;
	onRevertOrder: () => void;
	onMove: (index: number, dir: -1 | 1) => void;
	onMoveSection: (index: number, dir: -1 | 1) => void;
	onDelete: (field: Field) => void;
	onDeleteSection: (section: Section) => void;
}

function EmptySectionDropZone({
	sectionId,
	disabled,
}: {
	sectionId: string;
	disabled: boolean;
}) {
	const { ref, isDropTarget } = useDroppable({
		id: fieldDropId(sectionId),
		type: "form-field",
		accept: "form-field",
		disabled,
	});
	return (
		<div
			ref={ref}
			className={cn(
				"rounded-lg border border-dashed p-4 text-center text-sm transition-colors",
				isDropTarget
					? "border-primary bg-primary/5 text-foreground"
					: "text-muted-foreground",
			)}
		>
			{isDropTarget
				? "Solte aqui para mover o campo para esta seção"
				: "Nenhum campo nesta seção ainda. Arraste um campo para cá."}
		</div>
	);
}

interface SectionBlockProps {
	section: Section;
	position: number;
	total: number;
	selectedId: string;
	isPublished: boolean;
	sectionFields: Field[];
	fields: Field[];
	sortedSections: Section[];
	fieldsBySection: Map<string, Field[]>;
	orphanHalfIds: Set<string>;
	upsertSection: UseFormsBuilder["upsertSection"];
	onMoveSection: (index: number, dir: -1 | 1) => void;
	onDeleteSection: (section: Section) => void;
	moveWithinSection: (sectionId: string, fieldIndex: number, dir: -1 | 1) => void;
	onDelete: (field: Field) => void;
}

function SectionBlock({
	section,
	position,
	total,
	selectedId,
	isPublished,
	sectionFields,
	fields,
	sortedSections,
	orphanHalfIds,
	upsertSection,
	onMoveSection,
	onDeleteSection,
	moveWithinSection,
	onDelete,
}: SectionBlockProps) {
	const {
		ref: sectionRef,
		handleRef: sectionHandleRef,
		isDragging: isSectionDragging,
		isDropTarget: isSectionDropTarget,
	} = useSortable({
		id: sectionSortId(section.id),
		index: position,
		group: SECTIONS_GROUP,
		type: "form-section",
		accept: "form-section",
		disabled: isPublished,
		transition: { duration: 200, easing: "ease-in-out" },
	});

	return (
		<div
			ref={sectionRef}
			className={cn(
				"flex flex-col gap-2 rounded-lg border bg-transparent p-3 transition-all duration-200",
				isSectionDragging && "border-primary/60 opacity-60 shadow-lg",
				isSectionDropTarget &&
					!isSectionDragging &&
					"border-primary ring-primary/30 ring-2",
			)}
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex min-w-0 flex-wrap items-center gap-2">
					{!isPublished && (
						<span
							ref={sectionHandleRef}
							title="Arrastar para reordenar seção"
							className="text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 cursor-grab touch-none rounded p-1 transition-colors active:cursor-grabbing"
						>
							<GripVertical className="h-5 w-5" />
						</span>
					)}
					<span className="font-bold">
						{position + 1}. {section.title}
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
							disabled={position === 0}
							onClick={() => onMoveSection(position, -1)}
						>
							↑
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={position === total - 1}
							onClick={() => onMoveSection(position, 1)}
						>
							↓
						</Button>
						<SectionDialog
							versionId={selectedId}
							initial={section}
							upsertSection={upsertSection}
						/>
						<FieldDialog
							versionId={selectedId}
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
				<EmptySectionDropZone sectionId={section.id} disabled={isPublished} />
			) : (
				<div className="flex flex-col gap-3">
					{sectionFields.map((f, i) => {
						const globalIndex = fields.findIndex((gf) => gf.id === f.id);
						return (
							<SortableFieldRow
								key={f.id}
								field={f}
								index={i}
								group={section.id}
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
											versionId={selectedId}
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
			)}
		</div>
	);
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
	onPersistSectionOrder,
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

	function findFieldSectionId(fieldId: string): string | null {
		for (const [sid, list] of fieldsBySection) {
			if (list.some((f) => f.id === fieldId)) return sid;
		}
		if (ungrouped.some((f) => f.id === fieldId)) return null;
		const direct = fields.find((f) => f.id === fieldId);
		return direct?.sectionId ?? null;
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

	function handleDragEnd(event: {
		canceled: boolean;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		operation: { source: any; target: any };
	}) {
		isDraggingRef.current = false;
		if (event.canceled) {
			onRevertOrder();
			return;
		}
		const { source, target } = event.operation as {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			source: any;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			target: any | null;
		};
		if (!isSortable(source)) return;

		const rawSourceId = String(source.id);

		// --- Section reorder ---
		if (rawSourceId.startsWith(SECTION_PREFIX)) {
			const movedSectionId = rawSourceId.slice(SECTION_PREFIX.length);
			const from = sortedSections.findIndex((s) => s.id === movedSectionId);
			if (from < 0) return;
			let to: number | null = null;
			if (typeof source.index === "number") to = source.index as number;
			if (
				target &&
				isSortable(target) &&
				String((target as unknown as { id: unknown }).id).startsWith(SECTION_PREFIX)
			) {
				const t = target as unknown as Record<string, unknown>;
				if (typeof t.index === "number") to = t.index as number;
			}
			if (to === null || to === from) return;
			to = Math.max(0, Math.min(sortedSections.length - 1, to));
			const next = [...sortedSections];
			const [moved] = next.splice(from, 1);
			if (!moved) return;
			next.splice(to, 0, moved);
			onPersistSectionOrder(next);
			return;
		}

		// --- Field move (within or across sections) ---
		const movedFieldId = rawSourceId;
		const fromSectionId = (
			typeof source.initialGroup === "string"
				? (source.initialGroup as string)
				: typeof source.group === "string"
					? (source.group as string)
					: findFieldSectionId(movedFieldId)
		) as string | null;

		let toSectionId: string | null | undefined;
		let toIndex: number | undefined;
		const sourceGroup =
			typeof source.group === "string" ? (source.group as string) : undefined;
		const sourceIndex =
			typeof source.index === "number" ? (source.index as number) : undefined;

		if (target && typeof target === "object") {
			const targetId = String((target as { id: unknown }).id ?? "");
			const t = target as Record<string, unknown>;
			if (targetId.startsWith(FIELD_DROP_PREFIX)) {
				// Dropped onto an empty section zone -> append.
				const sid = targetId.slice(FIELD_DROP_PREFIX.length);
				toSectionId = sid === UNGROUPED ? null : sid;
				const len =
					sid === UNGROUPED
						? ungrouped.length
						: (fieldsBySection.get(sid)?.length ?? 0);
				toIndex = len;
			} else if (isSortable(target)) {
				if (!targetId.startsWith(SECTION_PREFIX)) {
					const g = t.group;
					toSectionId =
						typeof g === "string"
							? g === UNGROUPED
								? null
								: g
							: undefined;
					if (typeof t.index === "number") toIndex = t.index as number;
				}
			}
		}

		// Prefer the source's final optimistic group/index when available
		// (dnd-kit updates them live while hovering other groups).
		if (sourceGroup !== undefined && toSectionId === undefined) {
			toSectionId = sourceGroup === UNGROUPED ? null : sourceGroup;
		}
		if (toSectionId === undefined) {
			toSectionId = fromSectionId;
		}
		if (toIndex === undefined) {
			toIndex = sourceIndex ?? 0;
		}

		const fromKey = fromSectionId ?? UNGROUPED;
		const toKey = toSectionId ?? UNGROUPED;
		const fromList =
			fromKey === UNGROUPED
				? [...ungrouped]
				: [...(fieldsBySection.get(fromKey) ?? [])];
		const actualFrom = fromList.findIndex((f) => f.id === movedFieldId);
		if (actualFrom < 0) {
			onRevertOrder();
			return;
		}
		const [moved] = fromList.splice(actualFrom, 1);
		if (!moved) {
			onRevertOrder();
			return;
		}

		let destList: Field[];
		if (fromKey === toKey) {
			destList = fromList;
		} else {
			destList =
				toKey === UNGROUPED
					? [...ungrouped]
					: [...(fieldsBySection.get(toKey) ?? [])];
		}
		toIndex = Math.max(0, Math.min(destList.length, toIndex));
		destList.splice(toIndex, 0, moved);

		const lists = new Map<string, Field[]>();
		for (const [k, v] of fieldsBySection) lists.set(k, [...v]);
		lists.set(fromKey === UNGROUPED ? UNGROUPED : fromKey, fromKey === toKey ? destList : fromList);
		if (fromKey !== toKey) {
			lists.set(toKey === UNGROUPED ? UNGROUPED : toKey, destList);
		}

		const next: Field[] = [];
		for (const s of sortedSections) {
			next.push(...(lists.get(s.id) ?? []));
		}
		next.push(...(lists.get(UNGROUPED) ?? ungrouped.filter((f) => f.id !== movedFieldId)));

		if (fromKey === toKey) {
			const initialIndex =
				typeof source.initialIndex === "number"
					? (source.initialIndex as number)
					: actualFrom;
			if (initialIndex === toIndex) return;
			onPersistOrder(next);
		} else {
			onPersistOrder(next, { [movedFieldId]: toSectionId });
		}
	}

	let body: ReactNode;
	if (isLoadingFields) {
		body = (
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
		);
	} else if (sortedSections.length === 0) {
		body = (
			<p className="text-muted-foreground text-sm">
				Nenhuma seção ainda. Crie a primeira seção para começar.
			</p>
		);
	} else {
		body = (
			<DragDropProvider
				key={selected.id}
				onDragStart={() => {
					isDraggingRef.current = true;
				}}
				onDragEnd={handleDragEnd}
			>
				<div ref={listRef} className="flex flex-col gap-4">
					{sortedSections.map((section, si) => (
						<SectionBlock
							key={section.id}
							section={section}
							position={si}
							total={sortedSections.length}
							selectedId={selected.id}
							isPublished={isPublished}
							sectionFields={fieldsBySection.get(section.id) ?? []}
							fields={fields}
							sortedSections={sortedSections}
							fieldsBySection={fieldsBySection}
							orphanHalfIds={orphanHalfIds}
							upsertSection={upsertSection}
							onMoveSection={onMoveSection}
							onDeleteSection={onDeleteSection}
							moveWithinSection={moveWithinSection}
							onDelete={onDelete}
						/>
					))}
					{ungrouped.length > 0 && (
						<div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
							<div className="flex flex-wrap items-center gap-2">
								<span className="font-bold">Sem seção</span>
								<Badge variant="outline">{ungrouped.length}</Badge>
							</div>
							<p className="text-muted-foreground text-xs">
								Arraste para uma seção ou edite cada campo para atribuí-lo a
								uma seção.
							</p>
							<div className="flex flex-col gap-3">
								{ungrouped.map((f, i) => {
									const globalIndex = fields.findIndex(
										(gf) => gf.id === f.id,
									);
									return (
										<SortableFieldRow
											key={f.id}
											field={f}
											index={i}
											group={UNGROUPED}
											disabled={isPublished}
											isOrphanHalf={orphanHalfIds.has(f.id)}
											actions={
												!isPublished ? (
													<>
														<Button
															size="sm"
															variant="outline"
															disabled={i === 0}
															onClick={() => onMove(globalIndex, -1)}
														>
															↑
														</Button>
														<Button
															size="sm"
															variant="outline"
															disabled={i === ungrouped.length - 1}
															onClick={() => onMove(globalIndex, 1)}
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
															defaultSectionId={null}
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
												) : undefined
											}
										/>
									);
								})}
							</div>
						</div>
					)}
				</div>
			</DragDropProvider>
		);
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
				{body}
			</CardContent>
		</Card>
	);
}
