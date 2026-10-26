"use client";

import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";

interface WaitlistStatusBadgeProps {
	status: "waiting" | "offered" | "enrolled" | "expired" | "left" | "removed";
}

export function WaitlistStatusBadge({ status }: WaitlistStatusBadgeProps) {
	const statusConfig = {
		waiting: {
			label: "Aguardando",
			className:
				"bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-400",
		},
		offered: {
			label: "Oferta ativa",
			className:
				"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
		},
		enrolled: {
			label: "Inscrito",
			className:
				"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
		},
		expired: {
			label: "Expirada",
			className:
				"bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
		},
		left: {
			label: "Saiu da fila",
			className:
				"bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
		},
		removed: {
			label: "Removido",
			className:
				"bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
		},
	};

	const config = statusConfig[status];

	return (
		<Badge variant="outline" className={cn(config.className, "gap-1")}>
			{config.label}
		</Badge>
	);
}
