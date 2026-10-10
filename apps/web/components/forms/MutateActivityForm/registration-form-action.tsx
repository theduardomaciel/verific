"use client";

import Link from "next/link";

import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutput } from "@verific/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { revalidateActivities } from "@/app/actions";
import { trpc } from "@/lib/trpc/react";

type ActivityFormSummary = NonNullable<
	RouterOutput["getActivity"]["activity"]["form"]
>;

export function ActivityRegistrationFormAction({
	activityId,
	form,
}: {
	activityId: string;
	form: ActivityFormSummary | null;
}) {
	const utils = trpc.useUtils();
	const unpublish = trpc.unpublishVersion.useMutation();
	const remove = trpc.deleteVersion.useMutation();

	if (!form) {
		return (
			<Button
				type="button"
				variant="outline"
				className="shrink-0"
				asChild
			>
				<Link href={`/dashboard/activities/${activityId}/form`}>
					<Plus size={16} />
					Adicionar formulário
				</Link>
			</Button>
		);
	}

	const handleRemove = async () => {
		try {
			if (form.isPublished) {
				await unpublish.mutateAsync({ versionId: form.versionId });
				// Saiu do ar: o `hasForm` da programação precisa cair junto.
				await revalidateActivities();
				toast.success(
					"Formulário desvinculado. As inscrições voltam a ser diretas.",
				);
			} else {
				await remove.mutateAsync({ versionId: form.versionId });
				toast.success("Rascunho de formulário excluído.");
			}
			await Promise.all([
				utils.getActivity.invalidate(),
				utils.listVersions.invalidate(),
			]);
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Erro ao remover formulário.",
			);
		}
	};

	return (
		<div className="flex w-full flex-col gap-2 rounded-md border px-3 py-2 sm:w-auto sm:min-w-64">
			<div className="flex items-center gap-2 text-sm">
				<ClipboardList size={16} className="shrink-0" />
				<span className="font-medium">
					Formulário v{form.version} · {form.fieldsCount}{" "}
					{form.fieldsCount === 1 ? "campo" : "campos"}
				</span>
				<Badge
					variant={form.isPublished ? "default" : "secondary"}
					className="ml-auto shrink-0"
				>
					{form.isPublished ? "Publicado" : "Rascunho"}
				</Badge>
			</div>
			<div className="flex gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="flex-1"
					asChild
				>
					<Link href={`/dashboard/activities/${activityId}/form`}>
						<Pencil size={14} />
						Editar
					</Link>
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="flex-1"
					disabled={unpublish.isPending || remove.isPending}
					onClick={() => void handleRemove()}
				>
					<Trash2 size={14} />
					Remover
				</Button>
			</div>
		</div>
	);
}
