"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { trpc } from "@/lib/trpc/react";
import { findOrphanHalfIds } from "@/lib/forms/layout";
import { animateFlip } from "../lib/animate-flip";
import type { Field, FormsTab, Version } from "../types";

export function useFormsBuilder() {
	const { projectId } = useDashboard();
	const utils = trpc.useUtils();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [tab, setTab] = useState<FormsTab>("builder");
	const [displayFields, setDisplayFields] = useState<Field[]>([]);
	const [fieldToDelete, setFieldToDelete] = useState<Field | null>(null);
	const isDraggingRef = useRef(false);
	const listRef = useRef<HTMLDivElement>(null);

	const versionsQuery = trpc.listVersions.useQuery({ projectId });
	const versions: Version[] = useMemo(
		() => versionsQuery.data ?? [],
		[versionsQuery.data],
	);

	useEffect(() => {
		if (!selectedId && versions.length > 0) {
			const published =
				versions.find((v) => v.isPublished) ?? versions[0];
			if (published) setSelectedId(published.id);
		}
	}, [versions, selectedId]);

	const versionQuery = trpc.getVersion.useQuery(
		{ versionId: selectedId ?? "" },
		{ enabled: !!selectedId },
	);

	const createVersion = trpc.createVersion.useMutation({
		onSuccess: async (v) => {
			await utils.listVersions.invalidate();
			setSelectedId(v.id);
			toast.success(`Versão ${v.version} criada!`);
		},
		onError: (e) => toast.error(e.message),
	});
	const publishVersion = trpc.publishVersion.useMutation({
		onSuccess: async () => {
			await utils.listVersions.invalidate();
			await utils.getVersion.invalidate();
			await utils.getPublishedForm.invalidate();
			toast.success("Versão publicada!");
		},
		onError: (e) => toast.error(e.message),
	});
	const deleteVersion = trpc.deleteVersion.useMutation({
		onSuccess: async (_data, variables) => {
			await utils.listVersions.invalidate();
			await utils.getVersion.invalidate();
			setSelectedId((prev) =>
				prev === variables.versionId ? null : prev,
			);
			toast.success("Versão excluída!");
		},
		onError: (e) => toast.error(e.message),
	});
	const deleteField = trpc.deleteField.useMutation({
		onSuccess: async () => {
			await utils.getVersion.invalidate();
			await utils.listVersions.invalidate();
			setFieldToDelete(null);
			toast.success("Campo removido!");
		},
		onError: (e) => toast.error(e.message),
	});
	const reorderFields = trpc.reorderFields.useMutation({
		onSuccess: async () => {
			await utils.getVersion.invalidate();
		},
		onError: (e) => toast.error(e.message),
	});

	const serverFields: Field[] = useMemo(
		() =>
			(versionQuery.data?.fields ?? [])
				.slice()
				.sort((a, b) => a.order - b.order),
		[versionQuery.data],
	);

	useEffect(() => {
		if (isDraggingRef.current) return;
		// Only sync when the fetched data belongs to the current selection.
		// This avoids overwriting with stale data and removes the need for
		// a separate `setDisplayFields([])` on `selectedId` change, which
		// raced with this effect on cached versions and left the list
		// permanently empty.
		if (versionQuery.data && versionQuery.data.version.id !== selectedId)
			return;
		setDisplayFields(serverFields);
	}, [serverFields, selectedId, versionQuery.data]);

	const fields = displayFields;
	const selected = versions.find((v) => v.id === selectedId) ?? null;
	const isPublished = !!selected?.isPublished;
	const orphanHalfIds = useMemo(() => findOrphanHalfIds(fields), [fields]);

	// True while the fields for the current `selectedId` are not yet available.
	// Covers initial fetch (`isPending`) and version switches where the cached
	// `getVersion` data still belongs to the previous version (id mismatch),
	// so callers show a skeleton instead of flashing the empty state.
	const isLoadingFields =
		!!selectedId &&
		(versionQuery.isPending ||
			versionQuery.data?.version.id !== selectedId);

	function persistOrder(next: Field[]) {
		if (!selectedId) return;
		setDisplayFields(next);
		reorderFields.mutate({
			versionId: selectedId,
			orderedIds: next.map((f) => f.id),
		});
	}

	function revertOrder() {
		setDisplayFields(serverFields);
	}

	function move(index: number, dir: -1 | 1) {
		const next = [...fields];
		const j = index + dir;
		if (j < 0 || j >= next.length) return;
		const [item] = next.splice(index, 1);
		if (!item) return;
		next.splice(j, 0, item);
		animateFlip(listRef.current);
		persistOrder(next);
	}

	return {
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
		isLoadingFields,
		orphanHalfIds,
		fieldToDelete,
		setFieldToDelete,
		listRef,
		isDraggingRef,
		createVersion,
		publishVersion,
		deleteVersion,
		deleteField,
		persistOrder,
		revertOrder,
		move,
	};
}

export type UseFormsBuilder = ReturnType<typeof useFormsBuilder>;
