"use client";

import { useCallback } from "react";

// Components
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

// Hooks
import { useControlledParam } from "@/hooks/use-controlled-param";

interface SortByProps {
	items: Array<{ value: string; label: string }>;
	// Client-Driven: forneça ambas para gerenciar estado no pai
	value?: string;
	onChange?: (value: string) => void;
}

export function SortBy({ items, value, onChange }: SortByProps) {
	const {
		value: currentSort,
		setValue,
		isPending,
	} = useControlledParam({
		key: "sort",
		value,
		onChange,
		type: "string",
		defaultValue: items[0]?.value || "",
	});

	const onValueChange = useCallback(
		(val: string) => {
			setValue(val);
		},
		[setValue],
	);

	return (
		<Select
			value={(currentSort ?? "") as string}
			onValueChange={onValueChange}
			disabled={isPending}
		>
			<SelectTrigger className="flex flex-1 md:max-w-[180px]">
				<SelectValue placeholder="Ordenar por" />
			</SelectTrigger>
			<SelectContent>
				{items?.map((item) => (
					<SelectItem key={item.value} value={item.value}>
						{item.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
