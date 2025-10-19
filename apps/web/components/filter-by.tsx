"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { useQueryString } from "@/hooks/use-query-string";

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
	name: string;
	placeholder?: string;
	filterBy?: string | string[];
	items: Array<{ value: string; label: string }>;
}

export function FilterBy({
	name,
	placeholder,
	filterBy,
	items,
}: FilterByProps) {
	const router = useRouter();
	const { toUrl } = useQueryString();

	const handleSelect = (value: string) => {
		const newSelected = Array.isArray(filterBy)
			? filterBy.includes(value)
				? filterBy.filter((s) => s !== value)
				: [...filterBy, value]
			: filterBy === value
				? []
				: [value];
		router.push(toUrl({ [name]: newSelected.join(",") }));
	};

	// Get selected labels
	const selectedValues = Array.isArray(filterBy)
		? filterBy
		: filterBy
			? [filterBy]
			: [];

	const selectedLabels = items
		.filter((item) => selectedValues.includes(item.value))
		.map((item) => item.label);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					className="justify-between font-normal"
				>
					{selectedLabels.length > 0
						? listToString(selectedLabels)
						: (placeholder ?? "Filtrar por")}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
				<Command>
					<CommandInput placeholder="Buscar..." />
					<CommandList>
						<CommandEmpty>Nenhum encontrado.</CommandEmpty>
						<CommandGroup>
							{items.map((item) => (
								<CommandItem
									key={item.value}
									onSelect={() => handleSelect(item.value)}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											filterBy?.includes(item.value)
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
