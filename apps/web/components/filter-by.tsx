"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, useCallback } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { useQueryString } from "@/hooks/use-query-string";
import { useDebounce } from "@/hooks/use-debounce";

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
	filterBy?: string[];
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

	const [isPending, startTransition] = useTransition();

	// State for immediate UI feedback
	const [selected, setSelected] = useState<string[]>(filterBy || []);

	// Debounce changes to optimize server calls
	const debouncedSelected = useDebounce(selected, 750);

	// Update URL when debounced selection changes
	useEffect(() => {
		startTransition(() => {
			router.replace(
				toUrl({
					[`${name}`]:
						debouncedSelected.length === 0
							? undefined
							: debouncedSelected.join(","),
				}),
				{
					scroll: false,
				},
			);
		});
	}, [debouncedSelected, name, toUrl, router]);

	// Sync selected with external URL changes
	useEffect(() => {
		const urlFilters = filterBy || [];
		if (JSON.stringify(urlFilters) !== JSON.stringify(selected)) {
			setSelected(urlFilters);
		}
	}, [filterBy]);

	const handleSelect = useCallback((value: string) => {
		setSelected((prevSelected) =>
			prevSelected.includes(value)
				? prevSelected.filter((s) => s !== value)
				: [...prevSelected, value],
		);
	}, []);

	// Get selected labels
	const selectedLabels = items
		.filter((item) => selected.includes(item.value))
		.map((item) => item.label);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					disabled={isPending}
					className="flex flex-1 justify-between overflow-hidden font-normal text-ellipsis"
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
									value={item.value}
									onSelect={() => handleSelect(item.value)}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											selected.includes(item.value)
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
