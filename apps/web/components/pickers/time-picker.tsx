"use client";

import { useState, useMemo, useRef, useEffect } from "react";

import { formatTime, WALL_TIME_REGEX } from "@verific/drizzle/time";

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandInput,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";

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

function nearestTime(minutes: number): string {
	let best: string = times[0];
	let bestDiff = Infinity;
	for (const t of times) {
		const [h, m] = t.split(":").map(Number);
		const diff = Math.abs(h! * 60 + m! - minutes);
		if (diff < bestDiff) {
			bestDiff = diff;
			best = t;
		}
	}
	return best;
}

interface TimePickerProps {
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	/** Fuso do horário; sem valor, a lista abre perto da hora atual nele. */
	timeZone: string;
}

export function TimePicker({
	value,
	onChange,
	placeholder,
	className,
	disabled,
	timeZone,
}: TimePickerProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [resolvedTarget, setResolvedTarget] = useState<string | null>(null);
	const itemRef = useRef<HTMLDivElement>(null);

	const targetTime =
		resolvedTarget ??
		(value && times.includes(value as (typeof times)[number])
			? value
			: times[0]);

	const filteredTimes = useMemo(() => {
		let results: readonly string[] = times;
		if (search) {
			const normalized = search.replace(/\D/g, "");
			let prefix = normalized;
			if (prefix.length === 1) prefix = "0" + prefix;
			if (prefix.length > 2) prefix = prefix.slice(0, 2);

			// Prioriza horários que começam com o termo pesquisado
			const startsWith = times.filter((t) => t.startsWith(prefix));
			const contains = times.filter(
				(t) => !t.startsWith(prefix) && t.includes(search),
			);
			results = [...startsWith, ...contains];
		}
		return results;
	}, [search]);

	const isValidTime = WALL_TIME_REGEX.test(search);
	const customTime =
		isValidTime && !filteredTimes.includes(search) ? search : null;

	useEffect(() => {
		if (open) {
			const frame = requestAnimationFrame(() => {
				itemRef.current?.scrollIntoView({ block: "nearest" });
			});
			return () => cancelAnimationFrame(frame);
		}
	}, [open, resolvedTarget]);

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) {
					setSearch("");
					let target: string;
					if (
						value &&
						times.includes(value as (typeof times)[number])
					) {
						target = value;
					} else if (value) {
						const [h, m] = value.split(":").map(Number);
						target =
							!Number.isNaN(h) && !Number.isNaN(m)
								? nearestTime(h! * 60 + m!)
								: times[0];
					} else {
						const [h, m] = formatTime(new Date(), timeZone)
							.split(":")
							.map(Number);
						target = nearestTime(h! * 60 + m!);
					}
					setResolvedTarget(target);
				}
			}}
		>
			<PopoverTrigger asChild>
				<button
					type="button"
					disabled={disabled}
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
				className="w-(--radix-popover-trigger-width) p-0"
				onOpenAutoFocus={(e) => e.preventDefault()}
				onCloseAutoFocus={(e) => e.preventDefault()}
			>
				<Command loop defaultValue={targetTime} className="max-h-56">
					<CommandInput
						placeholder="Buscar horário..."
						value={search}
						onValueChange={setSearch}
						className="px-3 py-2 text-sm"
						autoFocus
					/>
					<CommandEmpty>Nenhum horário encontrado.</CommandEmpty>
					<CommandList className="max-h-56 overflow-y-auto">
						<CommandGroup>
							{customTime && (
								<CommandItem
									value={customTime}
									key={customTime}
									className="lg:py-3"
									onSelect={() => {
										onChange?.(customTime);
										setOpen(false);
									}}
								>
									{customTime} (personalizado)
								</CommandItem>
							)}
							{filteredTimes.map((time) => (
								<CommandItem
									value={time}
									key={time}
									ref={
										time === targetTime
											? itemRef
											: undefined
									}
									className={cn(
										"lg:py-3",
										time === value &&
											"bg-accent text-accent-foreground font-semibold",
									)}
									onSelect={() => {
										onChange?.(time);
										setOpen(false);
									}}
								>
									{time}
									{time === value && (
										<span className="ml-auto text-xs">
											✓
										</span>
									)}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
