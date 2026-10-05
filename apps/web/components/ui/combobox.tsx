"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
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

interface Props extends Omit<React.ComponentProps<"button">, "onChange"> {
	placeholder?: string;
	searchMessage?: string;
	emptyMessage?: string;
	items: {
		label: string;
		value?: string;
		keywords?: string[];
	}[];
	value: string;
	onChange: (value?: string) => void;
	/**
	 * Max rows mounted in the dropdown. cmdk mounts one node per item, so
	 * rendering thousands of rows makes open/filter noticeably slow. The
	 * list is filtered manually and sliced to this size; the user refines
	 * the search to reach the rest. Defaults to 100.
	 */
	maxVisibleItems?: number;
}

/** Accent-insensitive lowercase for pt-BR search ("otica" matches "ótica"). */
function normalizeSearch(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

export function Combobox({
	placeholder,
	searchMessage,
	emptyMessage,
	items,
	value,
	type = "button",
	onChange,
	maxVisibleItems = 100,
	...rest
}: Props) {
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState("");

	const selectedLabel = React.useMemo(
		() => items.find((item) => item.value === value)?.label,
		[items, value],
	);

	const { visibleItems, hiddenCount } = React.useMemo(() => {
		const q = normalizeSearch(query.trim());
		if (q === "") {
			return {
				visibleItems: items.slice(0, maxVisibleItems),
				hiddenCount: Math.max(items.length - maxVisibleItems, 0),
			};
		}
		const matched = items.filter(
			(item) =>
				normalizeSearch(item.label).includes(q) ||
				(item.value !== undefined &&
					item.value !== item.label &&
					normalizeSearch(item.value).includes(q)) ||
				item.keywords?.some((k) => normalizeSearch(k).includes(q)),
		);
		return {
			visibleItems: matched.slice(0, maxVisibleItems),
			hiddenCount: Math.max(matched.length - maxVisibleItems, 0),
		};
	}, [items, query, maxVisibleItems]);

	return (
		<Popover
			open={open}
			onOpenChange={(o) => {
				setOpen(o);
				if (!o) setQuery("");
			}}
		>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn(
						"w-full justify-between",
						!value && "text-muted-foreground",
					)}
					type={type}
					{...rest}
				>
					<span className="truncate">
						{value
							? selectedLabel
							: (placeholder ?? "Selecione um item...")}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-(--radix-popover-trigger-width) p-0"
				align="start"
			>
				{/* shouldFilter={false}: filtering is done above so cmdk
					never has to diff thousands of nodes per keystroke;
					only the sliced rows are mounted. */}
				<Command shouldFilter={false}>
					<CommandInput
						placeholder={searchMessage ?? "Pesquisar..."}
						value={query}
						onValueChange={setQuery}
					/>
					<CommandList>
						<CommandEmpty>
							{emptyMessage ?? "Nenhum item encontrado."}
						</CommandEmpty>
						<CommandGroup>
							{visibleItems.map((item) => (
								<CommandItem
									key={item.value || item.label}
									value={item.label}
									keywords={
										item.keywords ??
										(item.value && item.value !== item.label
											? [item.value]
											: undefined)
									}
									onSelect={() => {
										onChange(item.value);
										setOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											value === item.value
												? "opacity-100"
												: "opacity-0",
										)}
									/>
									{item.label}
								</CommandItem>
							))}
						</CommandGroup>
						{hiddenCount > 0 && (
							<div className="text-muted-foreground px-2 py-1.5 text-xs">
								Mostrando {visibleItems.length} de{" "}
								{visibleItems.length + hiddenCount} — refine a
								pesquisa…
							</div>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
