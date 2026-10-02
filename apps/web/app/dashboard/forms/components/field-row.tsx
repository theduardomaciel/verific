"use client";

import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Field } from "../types";

interface SortableFieldRowProps {
	field: Field;
	index: number;
	disabled: boolean;
	actions?: React.ReactNode;
	isOrphanHalf?: boolean;
}

export function SortableFieldRow({
	field,
	index,
	disabled,
	actions,
	isOrphanHalf,
}: SortableFieldRowProps) {
	const { ref, handleRef, isDragging, isDropTarget } = useSortable({
		id: field.id,
		index,
		disabled,
		type: "form-field",
		accept: "form-field",
		transition: { duration: 200, easing: "ease-in-out" },
	});

	return (
		<div
			ref={ref}
			data-field-id={field.id}
			className={cn(
				"bg-card flex flex-col gap-3 rounded-lg border p-3 transition-all duration-200 ease-in-out will-change-transform",
				"md:flex-row md:items-center md:justify-between",
				isDragging &&
					"border-primary/60 z-10 scale-[0.99] opacity-60 shadow-lg",
				isDropTarget &&
					!isDragging &&
					"border-primary ring-primary/30 shadow-md ring-2",
			)}
		>
			<div className="flex min-w-0 flex-1 items-start gap-2">
				{!disabled && (
					<span
						ref={handleRef}
						title="Arrastar para reordenar"
						className="text-muted-foreground hover:bg-muted hover:text-foreground mt-0.5 shrink-0 cursor-grab touch-none rounded p-1 transition-colors active:cursor-grabbing"
					>
						<GripVertical className="h-5 w-5" />
					</span>
				)}
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2 font-semibold">
						<span className="truncate">{field.label}</span>
						{field.required && <Badge>Obrigatório</Badge>}
						{field.halfWidth && (
							<Badge variant="secondary">½ largura</Badge>
						)}
						{isOrphanHalf && (
							<Badge
								variant="outline"
								className="border-amber-500 text-amber-600"
							>
								½ sozinha
							</Badge>
						)}
						{!field.isVisible && (
							<Badge variant="outline">Oculto</Badge>
						)}
						{!field.isActive && (
							<Badge variant="outline">Inativo</Badge>
						)}
					</div>
					<div className="text-muted-foreground mt-1 truncate text-xs">
						{field.type}
						{field.helpText ? ` • ${field.helpText}` : ""}
						{(field.options ?? []).length > 0
							? ` • opções: ${(field.options ?? []).join(", ")}`
							: ""}
					</div>
				</div>
			</div>
			{!disabled && actions && (
				<div className="flex shrink-0 items-center gap-3 pl-9 md:pl-0">
					{actions}
				</div>
			)}
		</div>
	);
}
