"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";

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
import { Button } from "../ui/button";

// Types

type ItemId = string | number;

interface Item {
	id: ItemId;
	label: string;
	image?: string | null;
}

interface InstancePickerProps<T extends Item = Item> {
	className?: string;
	initialItems?: T["id"][] | T["id"];
	items: T[];
	maxItems?: number;
	onSelect?: (ids: T["id"][]) => void;
	placeholder?: string;
	emptyText?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
	actionButton?: React.ReactNode;
	isLoading?: boolean;
	error?: string | null;
}

interface InstancesListProps<T extends Item = Item> {
	onSelect: (id: T["id"]) => void;
	isActive: (id: T["id"]) => boolean;
	items?: T[];
	className?: string;
	action?: InstancePickerProps<T>["action"];
	actionButton?: InstancePickerProps<T>["actionButton"];
	placeholder?: string;
	emptyText?: string;
}

export function InstancePicker<T extends Item = Item>({
	initialItems,
	maxItems,
	onSelect,
	placeholder = "Selecione um item...",
	emptyText = "Nenhum item encontrado.",
	isLoading = false,
	error = null,
	...props
}: InstancePickerProps<T>) {
	const [open, setOpen] = useState(false);
	const isDesktop = useMediaQuery("(min-width: 768px)");

	const [ids, setSelectedIds] = useState<T["id"][]>(
		initialItems
			? Array.isArray(initialItems)
				? initialItems
				: [initialItems]
			: [],
	);
	const debouncedValue = useDebounce(ids, 750);

	const isActive = (id: T["id"]) => ids.includes(id);
	const filteredItems = props.items?.filter((item) => ids.includes(item.id));

	const handleSelect = (id: T["id"]) => {
		if (ids.includes(id)) {
			setSelectedIds(ids.filter((itemId) => itemId !== id));
		} else {
			if (typeof maxItems === "number" && ids.length >= maxItems) {
				return; // Não permite selecionar mais do que o máximo
			}
			setSelectedIds([...ids, id]);
		}
	};

	useEffect(() => {
		onSelect?.(debouncedValue);
	}, [debouncedValue, onSelect]);

	const visualContent = (children: React.ReactNode) => {
		if (isLoading) {
			return (
				<div className="flex flex-1 items-center justify-center py-4">
					<Loader2 className="h-4 w-4 animate-spin" />
				</div>
			);
		}
		if (error) {
			return (
				<div className="text-destructive flex flex-1 items-center justify-center py-4">
					{error}
				</div>
			);
		}
		return children;
	};

	if (isDesktop) {
		return (
			<Popover>
				<PopoverTrigger asChild>
					<PickerTrigger
						items={filteredItems}
						placeholder={placeholder}
					/>
				</PopoverTrigger>
				<PopoverContent
					className={"w-[var(--radix-popover-trigger-width)] p-0"}
				>
					{visualContent(
						<InstancesList
							onSelect={handleSelect}
							isActive={isActive}
							placeholder={placeholder}
							emptyText={emptyText}
							{...props}
						/>,
					)}
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<DrawerTrigger asChild>
				<PickerTrigger
					items={filteredItems}
					placeholder={placeholder}
				/>
			</DrawerTrigger>
			<DrawerContent>
				<div className="mt-4 border-t">
					{visualContent(
						<InstancesList
							onSelect={handleSelect}
							isActive={isActive}
							placeholder={placeholder}
							emptyText={emptyText}
							{...props}
						/>,
					)}
				</div>
			</DrawerContent>
		</Drawer>
	);
}

function PickerItem<T extends Item = Item>({
	item,
	isActive,
}: {
	item: T;
	isActive: boolean;
}) {
	return (
		<div
			className={cn("flex w-full items-center justify-between", {
				"opacity-50": isActive,
			})}
		>
			<div className="flex items-center gap-3">
				{item.image && (
					<Image
						width={32}
						height={32}
						src={item.image}
						alt={item.label}
						className="h-8 w-8 rounded-full"
					/>
				)}
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

function PickerTrigger<T extends Item = Item>({
	className,
	items,
	placeholder = "Selecione um item...",
	...props
}: React.ComponentProps<typeof Button> & {
	items: T[];
	placeholder?: string;
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
					{placeholder}
				</p>
			)}
			<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
		</Button>
	);
}
function Tag<T extends Item = Item>({ item }: { item: T }) {
	return (
		<li className="border-primary-200/50 bg-background flex items-center justify-start gap-2 rounded-full border py-1 pr-2 pl-1">
			<div className="flex items-center gap-3">
				{item.image && (
					<Image
						width={24}
						height={24}
						src={item.image}
						alt={item.label}
						className="h-6 w-6 rounded-full"
					/>
				)}
				<span className="text-neutral max-w-full overflow-hidden text-xs font-bold overflow-ellipsis whitespace-nowrap">
					{item.label}
				</span>
			</div>
		</li>
	);
}

function InstancesList<T extends Item = Item>({
	items,
	className,
	onSelect,
	isActive,
	action,
	actionButton,
	placeholder = "Procurar...",
	emptyText = "Nenhum item encontrado.",
}: InstancesListProps<T>) {
	return (
		<Command className={className}>
			<CommandInput placeholder={placeholder} />
			<CommandEmpty>{emptyText}</CommandEmpty>
			<CommandGroup>
				{items ? (
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
				)}

				<hr className="border-muted-foreground/20 my-1 w-full border-t" />

				{actionButton ? (
					actionButton
				) : action ? (
					<CommandItem
						key="action-button"
						className="text-primary justify-center font-semibold"
						onSelect={action.onClick}
					>
						<Plus size={16} />
						{action.label}
					</CommandItem>
				) : null}
			</CommandGroup>
		</Command>
	);
}
