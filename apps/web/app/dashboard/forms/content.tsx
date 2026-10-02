"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { FormPreview } from "./preview";
import { useFormsBuilder } from "./hooks/use-forms-builder";
import { AnswersPanel } from "./components/answers-panel";
import { BuilderCard } from "./components/builder-card";
import { DeleteFieldDialog } from "./components/delete-field-dialog";
import { FormsHeader } from "./components/forms-header";
import { VersionsCard } from "./components/versions-card";

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
		versionQuery,
		fields,
		orphanHalfIds,
		fieldToDelete,
		setFieldToDelete,
		listRef,
		isDraggingRef,
		createVersion,
		publishVersion,
		deleteField,
		persistOrder,
		revertOrder,
		move,
	} = builder;

	if (versionsQuery.isPending) {
		return (
			<div className="container-d py-container-v min-h-screen">
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	return (
		<div className="container-d py-container-v flex min-h-screen flex-col gap-6">
			<FormsHeader tab={tab} onTabChange={setTab} />

			{tab === "answers" ? (
				<AnswersPanel projectId={projectId} />
			) : tab === "preview" ? (
				<FormPreview fields={fields} />
			) : (
				<>
					<VersionsCard
						versions={versions}
						selectedId={selectedId}
						onSelect={setSelectedId}
						onCreate={() =>
							createVersion.mutate({ projectId })
						}
						onDuplicate={(v) =>
							createVersion.mutate({
								projectId,
								cloneFromVersionId: v.id,
							})
						}
						isCreating={createVersion.isPending}
					/>

					{selected && (
						<BuilderCard
							selected={selected}
							isPublished={isPublished}
							fields={fields}
							isLoadingFields={versionQuery.isPending}
							orphanHalfIds={orphanHalfIds}
							listRef={listRef}
							isDraggingRef={isDraggingRef}
							isPublishing={publishVersion.isPending}
							onPublish={() =>
								publishVersion.mutate({
									versionId: selected.id,
								})
							}
							onPersistOrder={persistOrder}
							onRevertOrder={revertOrder}
							onMove={move}
							onDelete={setFieldToDelete}
						/>
					)}
				</>
			)}
			<DeleteFieldDialog
				field={fieldToDelete}
				isPending={deleteField.isPending}
				onClose={() => setFieldToDelete(null)}
				onConfirm={(f) =>
					deleteField.mutate({ fieldId: f.id })
				}
			/>
		</div>
	);
}
