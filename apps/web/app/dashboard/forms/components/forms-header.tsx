"use client";

import { Eye, PencilRulerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormsTab } from "../types";

interface FormsHeaderProps {
	tab: FormsTab;
	onTabChange: (tab: FormsTab) => void;
}

export function FormsHeader({ tab, onTabChange }: FormsHeaderProps) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-4">
			<h1 className="text-2xl font-bold">Formulário de inscrição</h1>
			<div className="flex gap-2">
				<Button
					variant={tab === "builder" ? "default" : "outline"}
					onClick={() => onTabChange("builder")}
				>
					<PencilRulerIcon />
					Editor
				</Button>
				<Button
					variant={tab === "preview" ? "default" : "outline"}
					onClick={() => onTabChange("preview")}
				>
					<Eye className="h-4 w-4" />
					Pré-visualizar
				</Button>
				<Button
					variant={tab === "answers" ? "default" : "outline"}
					onClick={() => onTabChange("answers")}
				>
					Respostas
				</Button>
			</div>
		</div>
	);
}
