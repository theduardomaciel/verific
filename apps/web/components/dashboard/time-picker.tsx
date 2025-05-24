"use client";

import { useState, useMemo } from "react";

import { cn } from "@/lib/utils";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandInput,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

const times = [
	"00:00",
	"00:15",
	"00:30",
	"00:45",
	"01:00",
	"01:15",
	"01:30",
	"01:45",
	"02:00",
	"02:15",
	"02:30",
	"02:45",
	"03:00",
	"03:15",
	"03:30",
	"03:45",
	"04:00",
	"04:15",
	"04:30",
	"04:45",
	"05:00",
	"05:15",
	"05:30",
	"05:45",
	"06:00",
	"06:15",
	"06:30",
	"06:45",
	"07:00",
	"07:15",
	"07:30",
	"07:45",
	"08:00",
	"08:15",
	"08:30",
	"08:45",
	"09:00",
	"09:15",
	"09:30",
	"09:45",
	"10:00",
	"10:15",
	"10:30",
	"10:45",
	"11:00",
	"11:15",
	"11:30",
	"11:45",
	"12:00",
	"12:15",
	"12:30",
	"12:45",
	"13:00",
	"13:15",
	"13:30",
	"13:45",
	"14:00",
	"14:15",
	"14:30",
	"14:45",
	"15:00",
	"15:15",
	"15:30",
	"15:45",
	"16:00",
	"16:15",
	"16:30",
	"16:45",
	"17:00",
	"17:15",
	"17:30",
	"17:45",
	"18:00",
	"18:15",
	"18:30",
	"18:45",
	"19:00",
	"19:15",
	"19:30",
	"19:45",
	"20:00",
	"20:15",
	"20:30",
	"20:45",
	"21:00",
	"21:15",
	"21:30",
	"21:45",
	"22:00",
	"22:15",
	"22:30",
	"22:45",
	"23:00",
	"23:15",
	"23:30",
	"23:45",
] as const;

interface TimePickerProps {
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
}

export function TimePicker({
	value,
	onChange,
	placeholder,
	className,
}: TimePickerProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");

	const filteredTimes = useMemo(() => {
		if (!search) return times;
		const normalized = search.replace(/\D/g, "");
		let prefix = normalized;
		if (prefix.length === 1) prefix = "0" + prefix;
		if (prefix.length > 2) prefix = prefix.slice(0, 2);

		// Prioriza horários que começam com o termo pesquisado
		const startsWith = times.filter((t) => t.startsWith(prefix));
		const contains = times.filter(
			(t) => !t.startsWith(prefix) && t.includes(search),
		);
		return [...startsWith, ...contains];
	}, [search]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={cn(
						"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
						"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
						"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
						className,
						!value && "text-muted-foreground",
					)}
				>
					{value || placeholder || "Selecione o horário"}
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="no-scrollbar max-h-56 w-[var(--radix-popover-trigger-width)] overflow-y-scroll p-0"
				onOpenAutoFocus={(e) => e.preventDefault()}
				onCloseAutoFocus={(e) => e.preventDefault()}
			>
				<Command loop>
					<CommandInput
						placeholder="Buscar horário..."
						value={search}
						onValueChange={setSearch}
						className="px-3 py-2 text-sm"
						autoFocus
					/>
					<CommandEmpty>Nenhum horário encontrado.</CommandEmpty>
					<CommandGroup>
						{filteredTimes.map((time) => (
							<CommandItem
								value={time}
								key={time}
								className="lg:py-3"
								onSelect={() => {
									onChange?.(time);
									setOpen(false);
								}}
							>
								{time}
							</CommandItem>
						))}
					</CommandGroup>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

// Função utilitária para converter Date em string HH:MM
export function dateToTimeString(date: Date) {
	return date.toTimeString().slice(0, 5);
}
