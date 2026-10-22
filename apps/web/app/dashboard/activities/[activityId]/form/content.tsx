"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ArrowLeft, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { AnswersPanel } from "@/app/dashboard/settings/forms/components/answers-panel";
import { BuilderCard } from "@/app/dashboard/settings/forms/components/builder-card";
import { DeleteFieldDialog } from "@/app/dashboard/settings/forms/components/dialog/delete-field-dialog";
import { DeleteSectionDialog } from "@/app/dashboard/settings/forms/components/dialog/delete-section-dialog";
import { useFormsBuilder } from "@/app/dashboard/settings/forms/hooks/use-forms-builder";
import { FormPreview } from "@/app/dashboard/settings/forms/preview";
import { trpc } from "@/lib/trpc/react";

export function ActivityFormContent({ activityId }: { activityId: string }) {
	// Pristine project builder: field/section/order mutations + dialogs state.
	// Version scoping (list + selection) is managed here for the activity.
	const builder = useFormsBuilder({ activityId });
	const {
		tab,
		setTab,
		versions,
		selectedId,
		setSelectedId,
		fields,
		sections,
		isLoadingFields,
		orphanHalfIds,
		fieldToDelete,
		setFieldToDelete,
		sectionToDelete,
		setSectionToDelete,
		listRef,
		isDraggingRef,
		publishVersion,
		deleteField,
		upsertSection,
		deleteSection,
		persistOrder,
		revertOrder,
		move,
		moveSection,
		persistSectionOrder,
		versionQuery,
	} = builder;

	const publishedBaseline = versions.find(
		(v) => v.isPublished && v.id !== selectedId,
	);
	const baselineQuery = trpc.getVersion.useQuery(
		{ versionId: publishedBaseline?.id ?? "" },
		{ enabled: !!publishedBaseline },
	);
	const baselineFields = baselineQuery.data?.fields ?? [];
	const baselineSections = baselineQuery.data?.sections ?? [];

	function sectionOrderMap(secs: typeof sections) {
		const m = new Map<string, number>();
		[...secs]
			.sort((a, b) => a.order - b.order)
			.forEach((s, i) => m.set(s.id, i));
		return m;
	}
	function normalizeForm(secs: typeof sections, flds: typeof fields) {
		const som = sectionOrderMap(secs);
		const secsNorm = [...secs]
			.sort((a, b) => a.order - b.order)
			.map((s) => ({
				title: s.title,
				order: s.order,
				visibilityRule: s.visibilityRule ?? null,
			}));
		const fldsNorm = [...flds]
			.sort((a, b) => a.order - b.order)
			.map((f) => ({
				key: f.key,
				label: f.label,
				type: f.type,
				helpText: f.helpText ?? null,
				required: f.required,
				order: f.order,
				sectionOrder: f.sectionId
					? (som.get(f.sectionId) ?? null)
					: null,
				halfWidth: f.halfWidth,
				options: f.options ?? null,
				allowOther: f.allowOther ?? false,
				validation: f.validation ?? null,
				isVisible: f.isVisible,
				editableAfterSignup: f.editableAfterSignup,
				isActive: f.isActive,
			}));
		return JSON.stringify({ secs: secsNorm, flds: fldsNorm });
	}
	const hasChangesFromBaseline =
		!publishedBaseline ||
		!baselineQuery.data ||
		normalizeForm(sections, fields) !==
			normalizeForm(baselineSections, baselineFields);
	const disablePublish = !!publishedBaseline && !hasChangesFromBaseline;

	const utils = trpc.useUtils();
	const [versionId, setVersionId] = useState<string | null>(null);
	const ensureRef = useRef(false);
	const ensureVersion = trpc.getOrCreateEditableActivityForm.useMutation();

	// Use versionQuery from builder (getVersion) instead of listVersions for selected version.
	// This avoids React Compiler memoization issues with listVersions invalidation timing.
	const selected = versionQuery.data?.version ?? null;
	const isPublished = !!selected?.isPublished;

	const runEnsure = (cloneIfPublished = false) => {
		ensureVersion.mutate(
			{ activityId, cloneIfPublished },
			{
				onSuccess: (result) => {
					if (result.version) {
						setVersionId(result.version.id);
						setSelectedId(result.version.id);
						// Invalidate listVersions so the new version appears in the list
						void utils.listVersions.invalidate();
						if (result.cloned) {
							toast.info(
								"Nova versão criada. As respostas anteriores foram mantidas e as alterações valem para novas inscrições.",
							);
						}
					}
				},
				onError: (e) => toast.error(e.message),
			},
		);
	};

	useEffect(() => {
		if (ensureRef.current) return;
		ensureRef.current = true;
		runEnsure();
	}, [activityId]);

	const ready =
		versionId !== null &&
		selectedId === versionId &&
		selected !== null &&
		!isLoadingFields &&
		!versionQuery.isPending;

	if (!ready && !ensureVersion.isError) {
		return (
			<div className="container-d py-container-v min-h-[calc(100dvh-var(--dashboard-header-height))]">
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	const sectionToDeleteFieldCount = sectionToDelete
		? fields.filter((f) => f.sectionId === sectionToDelete.id).length
		: 0;

	return (
		<div className="container-d py-container-v flex min-h-[calc(100dvh-var(--dashboard-header-height))] flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<Button variant="ghost" asChild>
					<Link
						href={`/dashboard/activities/${activityId}`}
						prefetch={false}
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Voltar para a atividade
					</Link>
				</Button>
				<div className="flex gap-2">
					<Button
						variant={tab === "builder" ? "default" : "outline"}
						onClick={() => setTab("builder")}
					>
						<Pencil className="mr-2 h-4 w-4" />
						Editor
					</Button>
					<Button
						variant={tab === "preview" ? "default" : "outline"}
						onClick={() => setTab("preview")}
					>
						<Eye className="mr-2 h-4 w-4" />
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

			<div>
				<h1 className="text-2xl font-extrabold">
					Formulário de inscrição
				</h1>
				<p className="text-muted-foreground text-sm">
					As respostas são solicitadas na inscrição da atividade.
					Salvar publica imediatamente.
				</p>
			</div>

			{tab === "preview" ? (
				<FormPreview
					fields={fields}
					sections={sections}
					isLoading={isLoadingFields}
					showNameField={false}
				/>
			) : tab === "answers" ? (
				<AnswersPanel
					projectId={builder.projectId}
					activityId={activityId}
				/>
			) : (
				<>
					{selected && isPublished ? (
						<div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-sm">
								Este formulário está publicado. Editar cria uma
								nova versão; as respostas anteriores são
								mantidas.
							</p>
							<Button
								onClick={() => runEnsure(true)}
								disabled={ensureVersion.isPending}
							>
								<Pencil className="mr-2 h-4 w-4" />
								Editar formulário
							</Button>
						</div>
					) : null}

					{selected && (
						<BuilderCard
							selected={selected}
							isPublished={isPublished}
							fields={fields}
							sections={sections}
							isLoadingFields={isLoadingFields}
							orphanHalfIds={orphanHalfIds}
							listRef={listRef}
							isDraggingRef={isDraggingRef}
							isPublishing={publishVersion.isPending}
							disablePublish={disablePublish}
							showLockedNameField={false}
							upsertSection={upsertSection}
							onPublish={() =>
								publishVersion.mutate(
									{ versionId: selected.id },
									{
										onSuccess: () => {
											void utils.getActivity.invalidate();
											void utils.getPublishedForm.invalidate();
											void utils.listVersions.invalidate();
										},
									},
								)
							}
							onPersistOrder={persistOrder}
							onPersistSectionOrder={persistSectionOrder}
							onRevertOrder={revertOrder}
							onMove={move}
							onMoveSection={moveSection}
							onDelete={setFieldToDelete}
							onDeleteSection={setSectionToDelete}
						/>
					)}
				</>
			)}
			<DeleteFieldDialog
				field={fieldToDelete}
				isPending={deleteField.isPending}
				onClose={() => setFieldToDelete(null)}
				onConfirm={(f) => deleteField.mutate({ fieldId: f.id })}
			/>
			<DeleteSectionDialog
				section={sectionToDelete}
				fieldCount={sectionToDeleteFieldCount}
				isPending={deleteSection.isPending}
				onClose={() => setSectionToDelete(null)}
				onConfirm={(s) => deleteSection.mutate({ sectionId: s.id })}
			/>
		</div>
	);
}
