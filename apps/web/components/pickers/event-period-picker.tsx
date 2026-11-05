"use client";

import { useState } from "react";

import { toWallTime, zonedInstant, type DayKey } from "@verific/drizzle/time";

import { Label } from "@/components/ui/label";

import { DateRangePicker } from "./date-range-picker";
import { TimePicker } from "./time-picker";

export interface EventPeriod {
	startDate: Date;
	endDate: Date;
}

/**
 * Período do evento: dias e horas de início e de fim, no fuso do evento.
 * Só avisa a mudança quando os dois dias estão escolhidos.
 */
export function EventPeriodPicker({
	value,
	onChange,
	timeZone,
}: {
	value?: Partial<EventPeriod>;
	onChange: (period: EventPeriod) => void;
	timeZone: string;
}) {
	const start = value?.startDate
		? toWallTime(value.startDate, timeZone)
		: undefined;
	const end = value?.endDate
		? toWallTime(value.endDate, timeZone)
		: undefined;
	// Guarda o intervalo incompleto enquanto o segundo dia não é escolhido
	const [pending, setPending] = useState<{ from?: DayKey } | null>(null);

	const startTime = start?.time ?? "00:00";
	const endTime = end?.time ?? "23:59";

	function emit(from: DayKey, to: DayKey, fromTime: string, toTime: string) {
		onChange({
			startDate: zonedInstant(from, fromTime, timeZone),
			endDate: zonedInstant(to, toTime, timeZone),
		});
	}

	return (
		<div className="flex flex-col gap-3">
			<DateRangePicker
				value={pending ?? { from: start?.day, to: end?.day }}
				onChange={(range) => {
					if (range?.from && range.to) {
						setPending(null);
						emit(range.from, range.to, startTime, endTime);
					} else {
						setPending({ from: range?.from });
					}
				}}
			/>
			<div className="flex flex-row gap-3">
				<div className="flex flex-1 flex-col gap-1.5">
					<Label>Início</Label>
					<TimePicker
						value={startTime}
						timeZone={timeZone}
						disabled={!start || !end}
						onChange={(time) =>
							start &&
							end &&
							emit(start.day, end.day, time, endTime)
						}
					/>
				</div>
				<div className="flex flex-1 flex-col gap-1.5">
					<Label>Fim</Label>
					<TimePicker
						value={endTime}
						timeZone={timeZone}
						disabled={!start || !end}
						onChange={(time) =>
							start &&
							end &&
							emit(start.day, end.day, startTime, time)
						}
					/>
				</div>
			</div>
		</div>
	);
}
