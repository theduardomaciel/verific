"use client";

import { useRef } from "react";
import { DownloadIcon, EllipsisIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/react";
import {
	formVersionExportSchema,
	type FormVersionExport,
} from "@verific/api/schemas";
import type { Field, Section, Version } from "../types";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

interface ExportImportActionsProps {
	projectId: string;
	version: Version | null;
	fields: Field[];
	sections: Section[];
	onImported: (versionId: string) => void;
}

export function ExportImportActions({
	projectId,
	version,
	fields,
	sections,
	onImported,
}: ExportImportActionsProps) {
	const utils = trpc.useUtils();
	const fileRef = useRef<HTMLInputElement>(null);

	const importMutation = trpc.importFormVersion.useMutation({
		onSuccess: async (v) => {
			await utils.listVersions.invalidate();
			setTimeout(() => onImported(v.id), 0);
			toast.success(`Formulário importado como versão ${v.version}!`);
		},
		onError: (e) => toast.error(e.message),
	});

	function handleExport() {
		if (!version) return;
		const keyByFieldId = new Map(fields.map((f) => [f.id, f.key]));
		const orderBySectionId = new Map(sections.map((s) => [s.id, s.order]));
		const payload: FormVersionExport = {
			kind: "verific-form-version",
			version: 1,
			exportedAt: new Date().toISOString(),
			sections: [...sections]
				.sort((a, b) => a.order - b.order)
				.map((s) => {
					const rule = s.visibilityRule;
					return {
						title: s.title,
						order: s.order,
						visibilityRule: rule
							? {
									sourceFieldKey:
										keyByFieldId.get(rule.sourceFieldId) ??
										"",
									operator: rule.operator,
									...(rule.values
										? { values: rule.values }
										: {}),
								}
							: null,
					};
				}),
			fields: [...fields]
				.sort((a, b) => a.order - b.order)
				.map((f) => ({
					key: f.key,
					label: f.label,
					type: f.type,
					helpText: f.helpText,
					required: f.required,
					halfWidth: f.halfWidth,
					order: f.order,
					sectionOrder: f.sectionId
						? (orderBySectionId.get(f.sectionId) ?? null)
						: null,
					options: f.options ?? undefined,
					allowOther: f.allowOther,
					validation: f.validation ?? undefined,
					isVisible: f.isVisible,
					editableAfterSignup: f.editableAfterSignup,
					isActive: f.isActive,
				})),
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `formulario-v${version.version}.json`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
		toast.success("Formulário exportado!");
	}

	async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		try {
			const text = await file.text();
			let json: unknown;
			try {
				json = JSON.parse(text);
			} catch {
				toast.error("O arquivo não é um JSON válido.");
				return;
			}
			const parsed = formVersionExportSchema.safeParse(json);
			if (!parsed.success) {
				toast.error(
					"Arquivo inválido: não parece uma exportação do formulário.",
				);
				return;
			}
			importMutation.mutate({ projectId, definition: parsed.data });
		} catch {
			toast.error("Não foi possível ler o arquivo.");
		}
	}

	return (
		<div className="flex gap-2">
			<Popover>
				<PopoverTrigger asChild>
					<Button size="icon-sm" variant="outline">
						<EllipsisIcon />
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-fit p-1!">
					<div className="grid gap-1">
						<Button
							className="justify-start gap-3"
							size="sm"
							variant="ghost"
							onClick={handleExport}
							disabled={!version}
						>
							<DownloadIcon />
							Exportar JSON
						</Button>
						<Button
							className="justify-start gap-3"
							size="sm"
							variant="ghost"
							onClick={() => fileRef.current?.click()}
							disabled={importMutation.isPending}
						>
							<UploadIcon />
							{importMutation.isPending
								? "Importando..."
								: "Importar JSON"}
						</Button>
					</div>
				</PopoverContent>
			</Popover>

			<input
				ref={fileRef}
				type="file"
				accept="application/json,.json"
				className="hidden"
				onChange={(e) => void handleFile(e)}
			/>
		</div>
	);
}
