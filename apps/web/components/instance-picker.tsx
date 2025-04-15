"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

// Hooks
import { useMediaQuery } from "@/hooks/use-media-query";
import { useDebounce } from "@/hooks/use-debounce";

// Components
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
} from "@/components/ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { SelectItem, SelectTrigger } from "./ui/select";
import { Button } from "./ui/button";

// Types

interface Item {
	id: string;
	label: string;
	image: string;
}

interface InstancePickerParams {
	className?: string;
	initialItems?: string[] | string;
	items: Item[];
	onSelect?: (ids: string[]) => void;
}

export function InstancePicker({
	className,
	onSelect,
	items,
	initialItems,
}: InstancePickerParams) {
	const [open, setOpen] = useState(false);
	const isDesktop = useMediaQuery("(min-width: 768px)");

	const [ids, setModeratorsIds] = useState<string[]>(
		initialItems
			? Array.isArray(initialItems)
				? initialItems
				: [initialItems]
			: [],
	);
	const debouncedValue = useDebounce(ids, 750);

	const isActive = (id: string) => ids.includes(id);
	const filteredItems = items?.filter((mod) => ids.includes(mod.id));

	const handleSelect = (id: string) => {
		if (ids.includes(id)) {
			setModeratorsIds(ids.filter((modId) => modId !== id));
		} else {
			setModeratorsIds([...ids, id]);
		}
	};

	useEffect(() => {
		onSelect?.(debouncedValue);
	}, [debouncedValue, onSelect]);

	if (isDesktop) {
		return (
			<Popover>
				<PopoverTrigger asChild>
					<PickerTrigger items={filteredItems} />
				</PopoverTrigger>
				<PopoverContent
					className={"w-[var(--radix-popover-trigger-width)] p-0"}
				>
					<ModeratorsList
						onSelect={handleSelect}
						isActive={isActive}
						items={items}
						className={className}
					/>
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<DrawerTrigger asChild>
				<PickerTrigger items={filteredItems} />
			</DrawerTrigger>
			<DrawerContent>
				<div className="mt-4 border-t">
					<ModeratorsList
						onSelect={handleSelect}
						isActive={isActive}
						items={items}
						className={className}
					/>
				</div>
			</DrawerContent>
		</Drawer>
	);
}

function PickerItem({ item, isActive }: { item: Item; isActive: boolean }) {
	return (
		<div
			className={cn("flex w-full items-center justify-between", {
				"opacity-50": isActive,
			})}
		>
			<div className="flex items-center gap-3">
				<Image
					width={32}
					height={32}
					src={item.image}
					alt={item.label}
					className="h-8 w-8 rounded-full"
				/>
				<span>{item.label}</span>
			</div>
			<Check
				className={cn(
					"h-4 w-4",
					isActive ? "opacity-100" : "opacity-0",
				)}
			/>
		</div>
	);
}

function PickerTrigger({
	className,
	items,
	...props
}: React.ComponentProps<typeof Button> & {
	items: Item[];
}) {
	return (
		<Button
			variant="outline"
			role="combobox"
			type="button"
			className={cn(
				"hover:text-neutral h-fit w-full justify-between px-3 text-sm font-normal lg:px-4",
				!items ||
					(items && items.length === 0 && "text-muted-foreground"),
				className,
			)}
			{...props}
		>
			{items && items.length > 0 ? (
				<ul className="flex flex-row flex-wrap justify-start gap-1">
					{items.map((item) => {
						return <Tag key={item.id} item={item} />;
					})}
				</ul>
			) : (
				<p className="overflow-hidden overflow-ellipsis whitespace-nowrap">
					Selecione um moderador...
				</p>
			)}
			<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
		</Button>
	);
}
function Tag({ item }: { item: Item }) {
	return (
		<li className="border-primary-200/50 bg-background flex items-center justify-start gap-2 rounded-full border py-1 pr-2 pl-1">
			<div className="flex items-center gap-3">
				<Image
					width={24}
					height={24}
					src={item.image}
					alt={item.label}
					className="h-6 w-6 rounded-full"
				/>
				<span className="text-neutral max-w-full overflow-hidden text-xs font-bold overflow-ellipsis whitespace-nowrap">
					{item.label}
				</span>
			</div>
		</li>
	);
}

interface ModeratorsListProps {
	onSelect: (id: string) => void;
	isActive: (id: string) => boolean;
	items?: Item[];
	className?: string;
}

function ModeratorsList({
	items,
	className,
	onSelect,
	isActive,
}: ModeratorsListProps) {
	return (
		<Command className={className}>
			<CommandInput placeholder="Procurar moderador..." />
			<CommandEmpty>Nenhum moderador encontrado.</CommandEmpty>
			<CommandGroup>
				{
					// Iterate through the items array
					// and render a CommandItem for each item
					items ? (
						items.map((item) => (
							<CommandItem
								key={item.id}
								className="aria-selected:bg-primary-200/50"
								onSelect={() => onSelect(item.id)}
							>
								<PickerItem
									item={item}
									isActive={isActive(item.id)}
								/>
							</CommandItem>
						))
					) : (
						<div className="flex flex-1 items-center justify-center py-4">
							<Loader2 className="h-4 w-4 animate-spin" />
						</div>
					)
				}
			</CommandGroup>
		</Command>
	);
}
