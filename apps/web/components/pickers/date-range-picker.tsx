"use client";

import * as React from "react";

import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import {
	calendarDate,
	dayOfCalendarDate,
	formatDayKey,
	type DayKey,
} from "@verific/drizzle/time";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";

export interface DayRange {
	from?: DayKey;
	to?: DayKey;
}

interface Props {
	className?: string;
	value?: DayRange;
	onChange?: (range: DayRange | undefined) => void;
}

const formatDay = (day: DayKey) =>
	formatDayKey(day, { day: "2-digit", month: "long", year: "numeric" });

/** Intervalo de dias de calendário, sem hora nem fuso. */
export function DateRangePicker({ className, value, onChange }: Props) {
	return (
		<div className={cn("grid gap-2", className)}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						id="date"
						variant={"outline"}
						className={cn(
							"justify-start text-left font-normal",
							!value && "text-muted-foreground",
						)}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{value?.from ? (
							value.to && value.to !== value.from ? (
								<>
									{formatDay(value.from)} -{" "}
									{formatDay(value.to)}
								</>
							) : (
								formatDay(value.from)
							)
						) : (
							<span>Escolha uma data</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="end">
					<Calendar
						// initialFocus removido para compatibilidade com Firefox
						mode="range"
						defaultMonth={
							value?.from ? calendarDate(value.from) : undefined
						}
						selected={{
							from: value?.from
								? calendarDate(value.from)
								: undefined,
							to: value?.to ? calendarDate(value.to) : undefined,
						}}
						onSelect={(range) =>
							onChange?.(
								range && {
									from:
										range.from &&
										dayOfCalendarDate(range.from),
									to: range.to && dayOfCalendarDate(range.to),
								},
							)
						}
						numberOfMonths={2}
						locale={ptBR}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
