"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
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
}

/** Fixed row height so virtualizer math stays exact (h-8). */
const ROW_HEIGHT = 32;

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
	...rest
}: Props) {
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState("");
	// Highlighted item, controlled so keyboard navigation can scroll it
	// into the virtualized window.
	const [activeValue, setActiveValue] = React.useState("");
	const keyboardNavRef = React.useRef(false);
	// State (not an object ref) so the virtualizer re-measures when the
	// portaled content mounts/unmounts.
	const [scrollEl, setScrollEl] = React.useState<HTMLDivElement | null>(null);

	const selectedLabel = React.useMemo(
		() => items.find((item) => item.value === value)?.label,
		[items, value],
	);

	const visibleItems = React.useMemo(() => {
		const q = normalizeSearch(query.trim());
		if (q === "") return items;
		return items.filter(
			(item) =>
				normalizeSearch(item.label).includes(q) ||
				(item.value !== undefined &&
					item.value !== item.label &&
					normalizeSearch(item.value).includes(q)) ||
				item.keywords?.some((k) => normalizeSearch(k).includes(q)),
		);
	}, [items, query]);

	// Virtualização via tanstack: biblioteca incompatível com o compiler
	// (uso imperativo de refs/scroll interno). O componente apenas consome
	// os itens visíveis; sem acesso a refs no render deste componente.
	// oxlint-disable-next-line react/incompatible-library -- uso confinado à virtualização; bailout aceito, sem quebra.
	const rowVirtualizer = useVirtualizer({
		count: visibleItems.length,
		getScrollElement: () => scrollEl,
		estimateSize: () => ROW_HEIGHT,
		overscan: 8,
	});

	// New search (or fresh open) → reset highlight and jump to the top.
	React.useEffect(() => {
		setActiveValue("");
		scrollEl?.scrollTo({ top: 0 });
	}, [query, scrollEl]);

	// A keyboard-driven highlight may land outside the rendered window, so
	// scroll it into view. Mouse hover also changes activeValue but must
	// not yank the scroll position.
	React.useEffect(() => {
		if (!keyboardNavRef.current) return;
		keyboardNavRef.current = false;
		if (!activeValue) return;
		const index = visibleItems.findIndex(
			(item) => item.label === activeValue,
		);
		if (index >= 0) rowVirtualizer.scrollToIndex(index, { align: "auto" });
	}, [activeValue, visibleItems, rowVirtualizer]);

	const virtualRows = rowVirtualizer.getVirtualItems();

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
					never diffs thousands of nodes per keystroke, and only
					the virtualized window is mounted. */}
				<Command
					shouldFilter={false}
					value={activeValue}
					onValueChange={setActiveValue}
					onKeyDown={(e) => {
						if (
							e.key === "ArrowDown" ||
							e.key === "ArrowUp" ||
							e.key === "Home" ||
							e.key === "End" ||
							e.key === "PageUp" ||
							e.key === "PageDown"
						) {
							keyboardNavRef.current = true;
						}
					}}
				>
					<CommandInput
						placeholder={searchMessage ?? "Pesquisar..."}
						value={query}
						onValueChange={setQuery}
					/>
					<div
						ref={setScrollEl}
						className="max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto"
					>
						<CommandEmpty>
							{emptyMessage ?? "Nenhum item encontrado."}
						</CommandEmpty>
						{virtualRows.length > 0 && (
							<div
								style={{
									height: rowVirtualizer.getTotalSize(),
									position: "relative",
									width: "100%",
								}}
							>
								{virtualRows.map((virtualRow) => {
									const item =
										visibleItems[virtualRow.index]!;
									return (
										<div
											key={item.value || item.label}
											style={{
												position: "absolute",
												top: 0,
												left: 0,
												width: "100%",
												height: `${virtualRow.size}px`,
												transform: `translateY(${virtualRow.start}px)`,
											}}
										>
											<CommandItem
												value={item.label}
												keywords={
													item.keywords ??
													(item.value &&
													item.value !== item.label
														? [item.value]
														: undefined)
												}
												onSelect={() => {
													onChange(item.value);
													setOpen(false);
												}}
												className="h-8"
											>
												<Check
													className={cn(
														"mr-2 h-4 w-4",
														value === item.value
															? "opacity-100"
															: "opacity-0",
													)}
												/>
												<span
													className="truncate"
													title={item.label}
												>
													{item.label}
												</span>
											</CommandItem>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
