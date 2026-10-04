"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { FormPreview } from "./preview";
import { useFormsBuilder } from "./hooks/use-forms-builder";
import { AnswersPanel } from "./components/answers-panel";
import { BuilderCard } from "./components/builder-card";
import { ProfileSectionCard } from "./components/profile-section-card";
import { DeleteFieldDialog } from "./components/dialog/delete-field-dialog";
import { DeleteSectionDialog } from "./components/dialog/delete-section-dialog";
import { FormsHeader } from "./components/forms-header";
import { VersionsCard } from "./components/versions-card";
import { ExportImportActions } from "./components/export-import-actions";

export function FormsContent() {
	const builder = useFormsBuilder();
	const {
		projectId,
		tab,
		setTab,
		versions,
		versionsQuery,
		selectedId,
		setSelectedId,
		selected,
		isPublished,
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
		createVersion,
		publishVersion,
		deleteVersion,
		deleteField,
		upsertSection,
		deleteSection,
		persistOrder,
		revertOrder,
		move,
		moveSection,
		persistSectionOrder,
	} = builder;

	if (versionsQuery.isPending) {
		return (
			<div className="container-d py-container-v min-h-screen">
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	const sectionToDeleteFieldCount = sectionToDelete
		? fields.filter((f) => f.sectionId === sectionToDelete.id).length
		: 0;

	return (
		<div className="container-d py-container-v flex min-h-screen flex-col gap-6">
			<FormsHeader tab={tab} onTabChange={setTab} />

			{tab === "answers" ? (
				<AnswersPanel projectId={projectId} />
			) : tab === "preview" ? (
				<FormPreview
					fields={fields}
					sections={sections}
					isLoading={isLoadingFields}
				/>
			) : (
				<>
					<VersionsCard
						versions={versions}
						selectedId={selectedId}
						onSelect={setSelectedId}
						onCreate={() => createVersion.mutate({ projectId })}
						onDuplicate={(v) =>
							createVersion.mutate({
								projectId,
								cloneFromVersionId: v.id,
							})
						}
						onDelete={(v) =>
							deleteVersion.mutate({ versionId: v.id })
						}
						isCreating={createVersion.isPending}
						isDeleting={deleteVersion.isPending}
						actions={
							<ExportImportActions
								projectId={projectId}
								version={selected}
								fields={fields}
								sections={sections}
								onImported={setSelectedId}
							/>
						}
					/>

					{selected && (
						<>
							<ProfileSectionCard
								projectId={projectId}
								fields={fields.map((f) => ({
									id: f.id,
									label: f.label,
								}))}
							/>
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
							upsertSection={upsertSection}
							onPublish={() =>
								publishVersion.mutate({
									versionId: selected.id,
								})
							}
							onPersistOrder={persistOrder}
							onPersistSectionOrder={persistSectionOrder}
							onRevertOrder={revertOrder}
							onMove={move}
							onMoveSection={moveSection}
							onDelete={setFieldToDelete}
							onDeleteSection={setSectionToDelete}
						/>
						</>
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
