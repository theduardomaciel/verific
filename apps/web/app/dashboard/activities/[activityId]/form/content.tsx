"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Eye, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { useFormsBuilder } from "@/app/dashboard/forms/hooks/use-forms-builder";
import { BuilderCard } from "@/app/dashboard/forms/components/builder-card";
import { DeleteFieldDialog } from "@/app/dashboard/forms/components/dialog/delete-field-dialog";
import { DeleteSectionDialog } from "@/app/dashboard/forms/components/dialog/delete-section-dialog";
import { FormPreview } from "@/app/dashboard/forms/preview";

export function ActivityFormContent({ activityId }: { activityId: string }) {
	const { projectId } = useDashboard();
	// Pristine project builder: field/section/order mutations + dialogs state.
	// Version scoping (list + selection) is managed here for the activity.
	const builder = useFormsBuilder();
	const {
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
	} = builder;

	const utils = trpc.useUtils();
	const [showPreview, setShowPreview] = useState(false);
	const [versionId, setVersionId] = useState<string | null>(null);
	const ensureRef = useRef(false);
	const ensureVersion = trpc.getOrCreateEditableActivityForm.useMutation();

	const { data: activityVersions } = trpc.listVersions.useQuery({
		projectId,
		activityId,
	});
	const selected = activityVersions?.find((v) => v.id === versionId) ?? null;
	const isPublished = !!selected?.isPublished;

	const runEnsure = () => {
		ensureVersion.mutate(
			{ activityId },
			{
				onSuccess: (result) => {
					if (result.version) {
						setVersionId(result.version.id);
						setSelectedId(result.version.id);
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
		!isLoadingFields;

	if (!ready && !ensureVersion.isError) {
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
			<div className="flex flex-wrap items-center justify-between gap-3">
				<Button variant="ghost" asChild>
					<Link href={`/dashboard/activities/${activityId}`}>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Voltar para a atividade
					</Link>
				</Button>
				<Button
					variant="outline"
					onClick={() => setShowPreview((v) => !v)}
				>
					<Eye className="mr-2 h-4 w-4" />
					{showPreview ? "Voltar ao editor" : "Pré-visualizar"}
				</Button>
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

			{showPreview ? (
				<FormPreview
					fields={fields}
					sections={sections}
					isLoading={isLoadingFields}
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
								onClick={runEnsure}
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
