"use client";

import {
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
	type RefObject,
} from "react";
import { CollisionPriority } from "@dnd-kit/abstract";
import { move } from "@dnd-kit/helpers";
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
import { animateFlip } from "../lib/animate-flip";
import type { Field, Section, Version } from "../types";
import type { SectionMutation } from "../hooks/use-forms-builder";
import { FieldDialog } from "./dialog/field-dialog";
import { SectionDialog } from "./dialog/section-dialog";
import { SortableFieldRow } from "./field-row";

const SECTIONS_GROUP = "__sections";
const UNGROUPED = "__ungrouped";
const SECTION_PREFIX = "section:";
const FIELD_TYPE = "form-field";
const SECTION_TYPE = "form-section";

type FieldGroups = Record<string, string[]>;

function sectionSortId(sectionId: string) {
	return `${SECTION_PREFIX}${sectionId}`;
}

function getSourceType(source: unknown): string | null {
	if (typeof source === "object" && source !== null && "type" in source) {
		const t = (source as { type?: unknown }).type;
		return typeof t === "string" ? t : null;
	}
	return null;
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
	upsertSection: SectionMutation;
	onPublish: () => void;
	onPersistOrder: (
		next: Field[],
		sectionIdByField?: Record<string, string | null>,
	) => void;
	onPersistSectionOrder: (next: Section[]) => void;
	onRevertOrder: () => void;
	onMove: (index: number, dir: -1 | 1) => void;
	onMoveSection: (index: number, dir: -1 | 1) => void;
	onDelete: (field: Field) => void;
	onDeleteSection: (section: Section) => void;
}

interface SectionBlockProps {
	section: Section;
	position: number;
	total: number;
	selectedId: string;
	isPublished: boolean;
	fieldIds: string[];
	fieldById: Map<string, Field>;
	fields: Field[];
	sections: Section[];
	orphanHalfIds: Set<string>;
	highlightDrop: boolean;
	upsertSection: SectionMutation;
	onMoveSection: (index: number, dir: -1 | 1) => void;
	onDeleteSection: (section: Section) => void;
	moveWithinSection: (
		sectionId: string,
		fieldIndex: number,
		dir: -1 | 1,
	) => void;
	onDelete: (field: Field) => void;
}

function describeRule(
	section: Section,
	fieldById: Map<string, Field>,
): string | null {
	const rule = (
		section as {
			visibilityRule?: {
				sourceFieldId: string;
				operator: string;
				values?: string[];
			} | null;
		}
	).visibilityRule;
	if (!rule) return null;
	const source = fieldById.get(rule.sourceFieldId);
	const name = source?.label ?? "campo removido";
	switch (rule.operator) {
		case "is_checked":
			return `Se “${name}” marcado`;
		case "is_not_checked":
			return `Se “${name}” desmarcado`;
		case "equals":
			return `Se “${name}” = ${(rule.values ?? []).join(", ")}`;
		case "includes_any":
			return `Se “${name}” contiver ${(rule.values ?? []).join(", ")}`;
		case "includes_all":
			return `Se “${name}” contiver todos: ${(rule.values ?? []).join(", ")}`;
		default:
			return `Condicional em “${name}”`;
	}
}

function SectionBlock({
	section,
	position,
	total,
	selectedId,
	isPublished,
	fieldIds,
	fieldById,
	fields,
	sections,
	orphanHalfIds,
	highlightDrop,
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
		type: SECTION_TYPE,
		accept: SECTION_TYPE,
		disabled: isPublished,
		transition: { duration: 200, easing: "ease-in-out" },
	});

	const { ref: listRef, isDropTarget: isListTarget } = useDroppable({
		id: section.id,
		accept: FIELD_TYPE,
		collisionPriority: CollisionPriority.Low,
		disabled: isPublished,
	});

	return (
		<div
			ref={sectionRef}
			data-section-id={section.id}
			className={cn(
				"flex flex-col gap-2 rounded-lg border bg-transparent p-3 transition-all duration-200 will-change-transform",
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
						{fieldIds.length} campo
						{fieldIds.length === 1 ? "" : "s"}
					</Badge>
					{describeRule(section, fieldById) && (
						<Badge
							variant="outline"
							title={describeRule(section, fieldById) ?? ""}
						>
							Condicional
						</Badge>
					)}
				</div>
				{describeRule(section, fieldById) && (
					<p className="text-muted-foreground w-full text-xs">
						{describeRule(section, fieldById)}
					</p>
				)}
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
							fields={fields}
							sections={sections}
							upsertSection={upsertSection}
						/>
						<FieldDialog
							versionId={selectedId}
							onDone={() => undefined}
							siblings={fields}
							position={fields.length}
							sectionId={section.id}
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
			<div
				ref={listRef}
				className={cn(
					"flex flex-col gap-3 rounded-lg transition-colors",
					fieldIds.length === 0 && "p-1",
					highlightDrop &&
						isListTarget &&
						"bg-primary/5 ring-primary/30 ring-2",
				)}
			>
				{fieldIds.length === 0 ? (
					<div
						className={cn(
							"rounded-lg border border-dashed p-4 text-center text-sm",
							isListTarget
								? "text-foreground"
								: "text-muted-foreground",
						)}
					>
						{isListTarget
							? "Solte aqui para mover o campo para esta seção"
							: "Nenhum campo nesta seção ainda. Arraste um campo para cá."}
					</div>
				) : (
					fieldIds.map((id, i) => {
						const f = fieldById.get(id);
						if (!f) return null;
						const globalIndex = fields.findIndex(
							(gf) => gf.id === f.id,
						);
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
											onClick={() =>
												moveWithinSection(
													section.id,
													i,
													-1,
												)
											}
										>
											↑
										</Button>
										<Button
											size="sm"
											variant="outline"
											disabled={i === fieldIds.length - 1}
											onClick={() =>
												moveWithinSection(
													section.id,
													i,
													1,
												)
											}
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
											sectionId={section.id}
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
					})
				)}
			</div>
		</div>
	);
}

interface UngroupedBoxProps {
	visible: boolean;
	fieldIds: string[];
	fieldById: Map<string, Field>;
	fields: Field[];
	selectedId: string;
	isPublished: boolean;
	orphanHalfIds: Set<string>;
	highlightDrop: boolean;
	onMove: (index: number, dir: -1 | 1) => void;
	onDelete: (field: Field) => void;
}

function UngroupedBox({
	visible,
	fieldIds,
	fieldById,
	fields,
	selectedId,
	isPublished,
	orphanHalfIds,
	highlightDrop,
	onMove,
	onDelete,
}: UngroupedBoxProps) {
	const { ref, isDropTarget } = useDroppable({
		id: UNGROUPED,
		accept: FIELD_TYPE,
		collisionPriority: CollisionPriority.Low,
		disabled: isPublished || !visible,
	});

	if (!visible) return null;

	return (
		<div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
			<div className="flex flex-wrap items-center gap-2">
				<span className="font-bold">Sem seção</span>
				<Badge variant="outline">{fieldIds.length}</Badge>
			</div>
			<p className="text-muted-foreground text-xs">
				Arraste para uma seção ou edite cada campo para atribuí-lo a uma
				seção.
			</p>
			<div
				ref={ref}
				className={cn(
					"flex flex-col gap-3 rounded-lg transition-colors",
					highlightDrop &&
						isDropTarget &&
						"bg-primary/5 ring-primary/30 ring-2",
				)}
			>
				{fieldIds.length === 0 ? (
					<div
						className={cn(
							"rounded-lg border border-dashed p-4 text-center text-sm",
							isDropTarget
								? "text-foreground"
								: "text-muted-foreground",
						)}
					>
						Solte aqui para remover o campo da seção
					</div>
				) : (
					fieldIds.map((id, i) => {
						const f = fieldById.get(id);
						if (!f) return null;
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
												onClick={() =>
													onMove(globalIndex, -1)
												}
											>
												↑
											</Button>
											<Button
												size="sm"
												variant="outline"
												disabled={
													i === fieldIds.length - 1
												}
												onClick={() =>
													onMove(globalIndex, 1)
												}
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
												sectionId={null}
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
					})
				)}
			</div>
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
	const sortedSections = useMemo(
		() => [...sections].sort((a, b) => a.order - b.order),
		[sections],
	);

	const fieldById = useMemo(
		() => new Map(fields.map((f) => [f.id, f])),
		[fields],
	);

	const sectionIdSet = useMemo(
		() => new Set(sortedSections.map((s) => s.id)),
		[sortedSections],
	);

	const baseGroups = useMemo<FieldGroups>(() => {
		const g: FieldGroups = {};
		for (const s of sortedSections) g[s.id] = [];
		g[UNGROUPED] = [];
		for (const f of [...fields].sort((a, b) => a.order - b.order)) {
			const key =
				f.sectionId && sectionIdSet.has(f.sectionId)
					? f.sectionId
					: UNGROUPED;
			g[key]?.push(f.id);
		}
		return g;
	}, [fields, sortedSections, sectionIdSet]);

	// Live preview of field positions while dragging (controlled, following
	// the documented multiple-sortable-lists pattern). Committed to the
	// server on drop and kept on screen until the new order lands in
	// `fields` (see the effect below); discarded immediately on cancel.
	const [fieldPreview, setFieldPreview] = useState<FieldGroups | null>(null);
	const [dragType, setDragType] = useState<string | null>(null);
	const groups = fieldPreview ?? baseGroups;
	const groupsRef = useRef(groups);
	groupsRef.current = groups;

	// Keep the preview until the persisted/optimistic order lands in `fields`,
	// otherwise the list flashes back to the old order on drop.
	useEffect(() => {
		if (isDraggingRef.current) return;
		setFieldPreview(null);
	}, [fields, isDraggingRef]);

	const draggingField = dragType === FIELD_TYPE;

	function moveWithinSection(
		sectionId: string,
		fieldIndex: number,
		dir: -1 | 1,
	) {
		const list = baseGroups[sectionId] ?? [];
		const j = fieldIndex + dir;
		if (j < 0 || j >= list.length) return;
		const nextIds = [...list];
		const [item] = nextIds.splice(fieldIndex, 1);
		if (!item) return;
		nextIds.splice(j, 0, item);
		const next: Field[] = [];
		for (const s of sortedSections) {
			const ids = s.id === sectionId ? nextIds : (baseGroups[s.id] ?? []);
			for (const id of ids) {
				const f = fieldById.get(id);
				if (f) next.push(f);
			}
		}
		for (const id of baseGroups[UNGROUPED] ?? []) {
			const f = fieldById.get(id);
			if (f) next.push(f);
		}
		animateFlip(listRef.current);
		onPersistOrder(next);
	}

	function commitFieldGroups(finalGroups: FieldGroups) {
		const next: Field[] = [];
		const sectionIdByField: Record<string, string | null> = {};
		for (const s of sortedSections) {
			// Fall back to the prop-derived order for any section the preview
			// doesn't know about (e.g. a refetch landed mid-drag), so fields
			// can never silently disappear from the committed order.
			const ids = finalGroups[s.id] ?? baseGroups[s.id] ?? [];
			for (const id of ids) {
				const f = fieldById.get(id);
				if (!f) continue;
				if (f.sectionId !== s.id) {
					sectionIdByField[id] = s.id;
					next.push({ ...f, sectionId: s.id });
				} else {
					next.push(f);
				}
			}
		}
		for (const id of finalGroups[UNGROUPED] ?? []) {
			const f = fieldById.get(id);
			if (!f) continue;
			if (f.sectionId !== null) {
				sectionIdByField[id] = null;
				next.push({ ...f, sectionId: null });
			} else {
				next.push(f);
			}
		}
		const prevSig =
			fields.map((f) => f.id).join(",") +
			"#" +
			fields.map((f) => f.sectionId ?? "").join(",");
		const nextSig =
			next.map((f) => f.id).join(",") +
			"#" +
			next.map((f) => f.sectionId ?? "").join(",");
		if (prevSig === nextSig) {
			// Nothing to persist, so `fields` won't change and the effect
			// above won't fire: clear the preview here.
			setFieldPreview(null);
			return;
		}
		onPersistOrder(
			next,
			Object.keys(sectionIdByField).length > 0
				? sectionIdByField
				: undefined,
		);
	}

	if (!selected) return null;

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
		const ungroupedIds = groups[UNGROUPED] ?? [];
		body = (
			<DragDropProvider
				key={selected.id}
				onDragStart={(event) => {
					isDraggingRef.current = true;
					setDragType(getSourceType(event.operation.source));
				}}
				onDragOver={(event) => {
					const { source } = event.operation;
					if (!source || getSourceType(source) !== FIELD_TYPE) return;
					const next = move(groupsRef.current, event);
					// `move` returns the same reference when nothing changed,
					// in which case React bails out of the re-render.
					setFieldPreview(next);
				}}
				onDragEnd={(event) => {
					isDraggingRef.current = false;
					setDragType(null);
					const { source } = event.operation;
					if (!source || !isSortable(source)) {
						setFieldPreview(null);
						return;
					}
					const sourceType = getSourceType(source);
					if (sourceType === SECTION_TYPE) {
						setFieldPreview(null);
						if (event.canceled) return;
						const ids = sortedSections.map((s) =>
							sectionSortId(s.id),
						);
						const nextIds = move(ids, event);
						if (nextIds.join(",") === ids.join(",")) return;
						const bySortId = new Map(
							sortedSections.map((s) => [sectionSortId(s.id), s]),
						);
						const next: Section[] = [];
						for (const id of nextIds) {
							const s = bySortId.get(id);
							if (s) next.push(s);
						}
						if (next.length !== sortedSections.length) {
							onRevertOrder();
							return;
						}
						onPersistSectionOrder(next);
						return;
					}
					if (sourceType !== FIELD_TYPE) {
						setFieldPreview(null);
						return;
					}
					if (event.canceled) {
						setFieldPreview(null);
						return;
					}
					// groupsRef.current already holds the result of every
					// onDragOver `move`. Do NOT call move() again here, and do
					// NOT clear the preview yet: the effect above clears it once
					// the new order reaches `fields`.
					commitFieldGroups(groupsRef.current);
				}}
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
							fieldIds={
								groups[section.id] ??
								baseGroups[section.id] ??
								[]
							}
							fieldById={fieldById}
							fields={fields}
							sections={sortedSections}
							orphanHalfIds={orphanHalfIds}
							highlightDrop={draggingField}
							upsertSection={upsertSection}
							onMoveSection={onMoveSection}
							onDeleteSection={onDeleteSection}
							moveWithinSection={moveWithinSection}
							onDelete={onDelete}
						/>
					))}
					<UngroupedBox
						visible={ungroupedIds.length > 0 || draggingField}
						fieldIds={ungroupedIds}
						fieldById={fieldById}
						fields={fields}
						selectedId={selected.id}
						isPublished={isPublished}
						orphanHalfIds={orphanHalfIds}
						highlightDrop={draggingField}
						onMove={onMove}
						onDelete={onDelete}
					/>
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
						<SectionDialog
							versionId={selected.id}
							fields={fields}
							sections={sortedSections}
							upsertSection={upsertSection}
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
				{body}
			</CardContent>
		</Card>
	);
}
