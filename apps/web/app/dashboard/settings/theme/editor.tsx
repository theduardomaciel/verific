"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/react";
import { revalidateProjectTheme } from "@/lib/theme/actions";
import { bestOnColor, contrastRatio } from "@/lib/theme/resolve";
import { DEFAULT_THEME, type EventTheme } from "@verific/drizzle/theme";
import { ThemeControls } from "./controls";
import { ThemePreview } from "./preview";

interface ThemeEditorProps {
	projectId: string;
	projectUrl: string;
	projectName: string;
	initial: EventTheme;
}

export function ThemeEditor({
	projectId,
	projectUrl,
	projectName,
	initial,
}: ThemeEditorProps) {
	const [draft, setDraft] = useState<EventTheme>(initial);
	const utils = trpc.useUtils();
	const saveMutation = trpc.updateProject.useMutation();

	const dirty = useMemo(
		() => JSON.stringify(draft) !== JSON.stringify(initial),
		[draft, initial],
	);

	const contrast = useMemo(() => {
		// Texto sobre as cores é sempre o de melhor contraste (derivado no
		// servidor); o bloqueio só dispara quando nem ele atinge AA.
		const onPrimary = bestOnColor(draft.primary);
		const onSecondary = bestOnColor(draft.secondary);
		return {
			primary: { fg: onPrimary, ratio: contrastRatio(onPrimary, draft.primary) },
			secondary: {
				fg: onSecondary,
				ratio: contrastRatio(onSecondary, draft.secondary),
			},
		};
	}, [draft]);

	const blocked =
		contrast.primary.ratio < 4.5 || contrast.secondary.ratio < 4.5;

	function patch(p: Partial<EventTheme>) {
		setDraft((d) => ({ ...d, ...p }));
	}

	async function fixContrast() {
		patch({ primary: DEFAULT_THEME.primary, secondary: DEFAULT_THEME.secondary });
		toast.success("Cores ajustadas para o padrão com bom contraste!");
	}

	async function onSave() {
		if (blocked) return;
		try {
			await saveMutation.mutateAsync({ id: projectId, theme: draft });
			await revalidateProjectTheme(projectUrl);
			utils.getProject.invalidate();
			toast.success("Tema aplicado! As páginas já foram atualizadas.");
		} catch {
			toast.error("Erro ao salvar tema.");
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h2 className="text-xl font-bold">Tema do evento</h2>
					<p className="text-muted-foreground text-sm">
						As mudanças aplicam na hora, sem rascunho.
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={!dirty}
						onClick={() => setDraft(initial)}
					>
						<RotateCcw className="mr-2 h-4 w-4" />
						Descartar
					</Button>
					<Button
						size="sm"
						disabled={!dirty || blocked || saveMutation.isPending}
						onClick={() => void onSave()}
					>
						<Save className="mr-2 h-4 w-4" />
						{saveMutation.isPending ? "Salvando…" : "Salvar tema"}
					</Button>
				</div>
			</div>

			{blocked && (
				<Card className="border-destructive flex flex-col gap-2 border p-4 text-sm md:flex-row md:items-center md:justify-between">
					<p>
						Mesmo o melhor texto (claro/escuro) não atinge AA (4.5):
						primária {contrast.primary.ratio.toFixed(2)} · secundária{" "}
						{contrast.secondary.ratio.toFixed(2)}. Ajuste as cores ou
						restaure o padrão.
					</p>
					<Button size="sm" variant="outline" onClick={() => void fixContrast()}>
						Restaurar cores padrão
					</Button>
				</Card>
			)}

			<div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[380px_1fr]">
				<ThemeControls draft={draft} patch={patch} contrast={contrast} />
				<ThemePreview draft={draft} projectName={projectName} />
			</div>
		</div>
	);
}
