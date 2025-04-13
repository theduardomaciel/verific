"use client";

import * as React from "react";
import { addDays, format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export function CalendarDateRangePicker({
	className,
}: React.HTMLAttributes<HTMLDivElement>) {
	const [date, setDate] = React.useState<DateRange | undefined>({
		from: subDays(new Date(), 3),
		to: addDays(new Date(), 5),
	});

	return (
		<div className={cn("grid gap-2", className)}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						id="date"
						variant={"outline"}
						className={cn(
							"justify-start text-left font-normal",
							!date && "text-muted-foreground",
						)}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{date?.from ? (
							date.to ? (
								<>
									{format(date.from, "dd 'de' MMM, yyyy", { locale: ptBR })} -{" "}
									{format(date.to, "dd 'de' MMM, yyyy", { locale: ptBR })}
								</>
							) : (
								format(date.from, "dd 'de' MMM, yyyy", { locale: ptBR })
							)
						) : (
							<span>Escolha uma data</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="end">
					<Calendar
						initialFocus
						mode="range"
						defaultMonth={date?.from}
						selected={date}
						onSelect={setDate}
						numberOfMonths={2}
						locale={ptBR}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
