"use client";

import { Copy, FileCode2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

import { buildDiagnostic, copyText, errorTextOf } from "./helpers";

import type { EmailsListItem } from "./helpers";

const ICON_BUTTON_CLASS = "size-6 shrink-0 [&_svg]:size-3.5";

/**
 * Célula de erro: uma linha monoespaçada com reticências (linhas de altura
 * uniforme). O erro completo fica na gaveta de detalhes e nos botões de
 * copiar, que aparecem no hover/foco da linha, ficam sempre visíveis em
 * telas de toque e caem para execCommand quando a Clipboard API não está
 * disponível.
 */
export function ErrorCell({ item }: { item: EmailsListItem }) {
	const text = errorTextOf(item);
	if (text === "—") {
		return <span className="text-muted-foreground">—</span>;
	}

	async function handleCopy(kind: "error" | "diagnostic") {
		const value = kind === "error" ? text : buildDiagnostic(item);
		const ok = await copyText(value);
		if (ok) {
			toast.success(
				kind === "error"
					? "Erro copiado para a área de transferência"
					: "Diagnóstico copiado para a área de transferência",
			);
		} else {
			toast.error(
				"Não foi possível copiar. Selecione o texto manualmente.",
			);
		}
	}

	return (
		<div className="group/error flex min-w-0 items-center gap-1">
			<span
				className="block min-w-0 flex-1 truncate font-mono text-xs"
				data-testid="error-text"
			>
				{text}
			</span>
			<div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within/error:opacity-100 group-hover/error:opacity-100 [@media(hover:none)]:opacity-100">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							className={ICON_BUTTON_CLASS}
							aria-label="Copiar erro"
							onClick={() => void handleCopy("error")}
						>
							<Copy />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="top">
						Copiar erro completo
					</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							className={ICON_BUTTON_CLASS}
							aria-label="Copiar diagnóstico"
							onClick={() => void handleCopy("diagnostic")}
						>
							<FileCode2 />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="top" className="max-w-36">
						Copiar diagnóstico (id, tipo, status, datas, refs)
					</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
}
