"use client";

import { useCallback } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

// Hooks
import { useControlledParam } from "@/hooks/use-controlled-param";

// Components
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

import { listToString } from "@/lib/i18n";

interface FilterByProps {
	prefix?: string;
	placeholder?: string;
	items: Array<{ value: string; label: string }>;
	// Client-Driven: forneça ambas para gerenciar estado no pai
	value?: string[];
	onChange?: (value: string[]) => void;
}

export function FilterBy({
	prefix = "filter",
	placeholder,
	items,
	value,
	onChange,
}: FilterByProps) {
	const {
		value: selectedValues,
		setValue,
		isPending,
	} = useControlledParam({
		key: prefix,
		value,
		onChange,
		type: "array",
	});

	const handleSelect = useCallback(
		(val: string) => {
			const current = (selectedValues ?? []) as string[];
			let newValues: string[];
			if (current.includes(val)) {
				newValues = current.filter((v) => v !== val);
			} else {
				newValues = [...current, val];
			}
			setValue(newValues);
		},
		[selectedValues, setValue],
	);

	// Get selected labels
	const selectedLabels = items
		.filter((item) => (selectedValues ?? []).includes(item.value))
		.map((item) => item.label);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					disabled={isPending}
					className="flex min-w-40 flex-1 justify-between overflow-hidden font-normal text-ellipsis"
				>
					{selectedLabels.length > 0
						? listToString(selectedLabels)
						: (placeholder ?? "Filtrar por")}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-(--radix-popover-trigger-width) p-0">
				<Command>
					<CommandInput placeholder="Buscar..." />
					<CommandList>
						<CommandEmpty>Nenhum encontrado.</CommandEmpty>
						<CommandGroup>
							{items.map((item) => (
								<CommandItem
									key={item.value}
									value={item.value}
									onSelect={() => handleSelect(item.value)}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											(selectedValues ?? []).includes(
												item.value,
											)
												? "opacity-100"
												: "opacity-0",
										)}
									/>
									{item.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
