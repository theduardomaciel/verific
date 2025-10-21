"use client";

import * as React from "react";
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

interface Props {
	className?: string;
	value?: DateRange;
	onChange?: (range: DateRange | undefined) => void;
}

export function DateRangePicker({ className, value, onChange }: Props) {
	const formatDate = (date: Date) => {
		const str = date.toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
		const parts = str.split(" ");
		return `${parts[0]} de ${parts[2]}, ${parts[4]}`;
	};

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
							value.to ? (
								<>
									{formatDate(value.from)} -{" "}
									{formatDate(value.to)}
								</>
							) : (
								formatDate(value.from)
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
						defaultMonth={value?.from}
						selected={value}
						onSelect={onChange}
						numberOfMonths={2}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
