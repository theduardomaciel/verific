"use client";

import { useState } from "react";

import { ChevronDown, ChevronUp, Copy, FileCode2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

import { buildDiagnostic, copyText, errorTextOf } from "./helpers";

import type { EmailsListItem } from "./helpers";

/**
 * Célula de erro: texto monoespaçado e selecionável, truncado em 2 linhas
 * com expandir/recolher, e botões de copiar (erro completo ou diagnóstico
 * da linha) que funcionam por teclado e caem para execCommand quando a
 * Clipboard API não está disponível.
 */
export function ErrorCell({ item }: { item: EmailsListItem }) {
	const [expanded, setExpanded] = useState(false);
	const text = errorTextOf(item);
	if (text === "—") {
		return <span className="text-muted-foreground">—</span>;
	}
	const isLong = text.length > 80;

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
		<div className="flex max-w-72 items-start gap-1">
			<span
				className={
					"font-mono text-xs break-all " +
					(expanded ? "" : "line-clamp-2")
				}
				data-testid="error-text"
			>
				{text}
			</span>
			<div className="flex shrink-0 flex-col gap-0.5">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Copiar erro"
							onClick={() => void handleCopy("error")}
						>
							<Copy />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Copiar erro completo</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Copiar diagnóstico"
							onClick={() => void handleCopy("diagnostic")}
						>
							<FileCode2 />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						Copiar diagnóstico (id, tipo, status, datas, refs)
					</TooltipContent>
				</Tooltip>
				{isLong ? (
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={
							expanded ? "Recolher erro" : "Expandir erro"
						}
						aria-expanded={expanded}
						data-testid="error-toggle"
						onClick={() => setExpanded((value) => !value)}
					>
						{expanded ? <ChevronUp /> : <ChevronDown />}
					</Button>
				) : null}
			</div>
		</div>
	);
}
