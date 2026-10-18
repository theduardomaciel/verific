import { X } from "lucide-react";

import { badgeVariants } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";

/** Variante de badge de cada status: mesma do StatusBadge da tabela. */
export const COUNTER_VARIANT: Record<
	string,
	NonNullable<Parameters<typeof badgeVariants>[0]>["variant"]
> = {
	pending: "secondary",
	sending: "info",
	stuck: "warning",
	sent: "success",
	failed: "destructive",
	blocked_quota: "warning",
	skipped: "outline",
};

interface StatusChipProps {
	label: string;
	help: string;
	active: boolean;
	count?: number;
	variant: NonNullable<Parameters<typeof badgeVariants>[0]>["variant"];
	onClick: () => void;
}

/** Pílula de status no estilo dos badges; selecionada = anel neutro (sem azul). */
export function StatusChip({
	label,
	help,
	active,
	count,
	variant,
	onClick,
}: StatusChipProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-pressed={active}
					aria-label={`${label}${count != null ? `: ${count}` : ""}. ${help}`}
					onClick={onClick}
					className={cn(
						badgeVariants({ variant }),
						"focus-visible:ring-ring h-7 cursor-pointer px-2.5 transition-[filter,box-shadow] hover:brightness-95 focus-visible:ring-2 focus-visible:outline-none dark:hover:brightness-125",
						active &&
							"ring-foreground/30 border-foreground/40 ring-2",
						count === 0 && !active && "opacity-60",
					)}
				>
					{label}
					{count != null ? (
						<span className="tabular-nums opacity-80">{count}</span>
					) : null}
					{active && <X className="ml-1 h-3 w-3 opacity-50" />}
				</button>
			</TooltipTrigger>
			<TooltipContent side="bottom" className="max-w-64">
				{help}
			</TooltipContent>
		</Tooltip>
	);
}
