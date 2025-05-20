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
		value: string;
		label: string;
	}[];
	value: string;
	onChange: (value: string) => void;
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

	return (
		<Popover open={open} onOpenChange={setOpen}>
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
					{value
						? items.find((item) => item.value === value)?.label
						: (placeholder ?? "Selecione um item...")}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-full p-0">
				<Command>
					<CommandInput
						placeholder={searchMessage ?? "Pesquisar..."}
					/>
					<CommandList>
						<CommandEmpty>
							{emptyMessage ?? "Nenhum item encontrado."}
						</CommandEmpty>
						<CommandGroup>
							{items.map((item) => (
								<CommandItem
									key={item.value}
									value={item.value}
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
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
