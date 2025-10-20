// Date and time functions
const saoPauloFormatter = new Intl.DateTimeFormat("pt-BR", {
	timeZone: "America/Sao_Paulo",
	dateStyle: "short",
	timeStyle: "short",
});

const saoPauloDateFormatter = new Intl.DateTimeFormat("pt-BR", {
	timeZone: "America/Sao_Paulo",
	day: "2-digit",
	month: "2-digit",
});

export const isDateDifferent = (date1: Date, date2: Date) => {
	const d1 = new Date(date1);
	const d2 = new Date(date2);
	return (
		d1.getDate() !== d2.getDate() ||
		d1.getMonth() !== d2.getMonth() ||
		d1.getFullYear() !== d2.getFullYear()
	);
};

export const getDateString = (dateFrom: Date, dateTo: Date) => {
	const dateString = `${saoPauloDateFormatter.format(new Date(dateFrom))}${isDateDifferent(new Date(dateFrom), new Date(dateTo))
		? ` - ${saoPauloDateFormatter.format(new Date(dateTo))}`
		: ""
		}`;

	return dateString;
};

export const getTimeString = (date: Date, asHourFormat = false) => {
	if (asHourFormat) {
		const hours = new Date(date).getHours();
		const minutes = new Date(date).getMinutes();
		return minutes === 0 ? `${hours}h` : `${hours}h${minutes.toString().padStart(2, "0")}`;
	}
	return saoPauloFormatter.format(new Date(date)).split(' ')[1];
};

export const isBeforeStart = (startDate: Date) => {
	return new Date() < new Date(startDate);
}

export const isAfterEnd = (endDate: Date) => {
	return new Date() > new Date(endDate);
}

export const calculateWorkloadFromTimes = (
	timeFrom: string | undefined,
	timeTo: string | undefined
): number | undefined => {
	if (timeFrom && timeTo) {
		const [fromHoursStr, fromMinutesStr] = timeFrom.split(":");
		const [toHoursStr, toMinutesStr] = timeTo.split(":");

		const fromHours: number = Number(fromHoursStr ?? "0");
		const fromMinutes: number = Number(fromMinutesStr ?? "0");

		const toHours: number = Number(toHoursStr ?? "0");
		const toMinutes: number = Number(toMinutesStr ?? "0");

		let workload: number = toHours - fromHours + (toMinutes - fromMinutes) / 60;

		if (workload < 0) {
			workload = 0;
		}

		return Math.round(workload * 100) / 100;
	}

	return undefined;
}

/* 
	Uma atividade está "ao vivo" se a data atual estiver entre a data de início e a data de término da atividade.
*/
export const isLive = (date: Date): boolean => {
	const now = Date.now();
	const startTime = new Date(date).getTime();
	const endTime = startTime + 60 * 60 * 1000; // 1 hora de duração
	return now >= startTime && now <= endTime;
};

/* 
	Uma atividade está "começando em instantes" se estiver para começar nos próximos 15 minutos.
*/
export const isStartingSoon = (date: Date): boolean => {
	const now = Date.now();
	const startTime = new Date(date).getTime();
	return startTime > now && startTime - now <= 15 * 60 * 1000;
};

export const isToday = (date: Date): boolean => {
	return new Date(date).toDateString() === new Date().toDateString();
};

export const isTomorrow = (date: Date): boolean => {
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	return new Date(date).toDateString() === tomorrow.toDateString();
};

export function categorizeByDate<T>(
	items: T[],
	getDate: (item: T) => Date
): { grouped: Map<string, T[]>; categories: string[] } {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);

	const grouped = new Map<string, T[]>();
	for (const item of items) {
		const activityDate = new Date(getDate(item));
		activityDate.setHours(0, 0, 0, 0);
		let category: string;
		if (activityDate.getTime() === today.getTime()) {
			category = "Hoje";
		} else if (activityDate.getTime() === tomorrow.getTime()) {
			category = "Amanhã";
		} else {
			category = activityDate.toLocaleDateString("pt-BR", {
				day: "2-digit",
				month: "long",
			});
		}
		if (!grouped.has(category)) {
			grouped.set(category, []);
		}
		grouped.get(category)!.push(item);
	}

	const categories = Array.from(grouped.keys()).sort((a, b) => {
		if (a === "Hoje") return -1;
		if (b === "Hoje") return 1;
		if (a === "Amanhã") return -1;
		if (b === "Amanhã") return 1;
		// Parse dates (DD/MM to Date)
		const dateA = new Date(a.split("/").reverse().join("-"));
		const dateB = new Date(b.split("/").reverse().join("-"));
		return dateA.getTime() - dateB.getTime();
	});

	return { grouped, categories };
}

export interface FriendlyDateOptions {
	includeDay?: boolean;
	includeHour?: boolean;
	longMonth?: boolean;
	locale?: string;
}

/**
 * Formats a Date into a human-friendly, localized string.
 *
 * Behavior:
 * - If the date is today, returns "Hoje" or "Hoje, HH:mm" when includeHour is true.
 * - If the date is tomorrow, returns "Amanhã" or "Amanhã, HH:mm" when includeHour is true.
 * - Otherwise formats the date using Intl.DateTimeFormat with the provided locale (default "pt-BR")
 *   and the fixed timezone "America/Sao_Paulo". When both date and time are present, the output
 *   will insert "às" before the time (e.g. "12 de abril, às 14:30" -> "12 de abril, às 14:30").
 *
 * @param date - The Date instance to format.
 * @param options - Optional formatting flags.
 * @param options.includeDay - Whether to include day and month in the output. Default: true.
 * @param options.includeHour - Whether to include hour and minute in the output. Default: false.
 * @param options.longMonth - When includeDay is true, use the full month name (e.g. "abril") instead of numeric month. Default: false.
 * @param options.locale - Locale identifier passed to Intl.DateTimeFormat (affects language and numeric formatting). Default: "pt-BR".
 * @returns A localized, human-friendly string representing the given date (examples: "Hoje", "Amanhã, 14:30", "12/04, às 14:30", "12 de abril, às 14:30").
 */
export function formatFriendlyDate(date: Date, options?: FriendlyDateOptions): string {
	const {
		includeDay = true,
		includeHour = false,
		longMonth = false,
		locale = "pt-BR",
	} = options || {};

	const now = new Date();
	const today = isToday(date);
	const tomorrow = isTomorrow(date);

	if (today) {
		return includeHour
			? `Hoje, ${new Intl.DateTimeFormat("pt-BR", {
				timeZone: "America/Sao_Paulo",
				hour: "2-digit",
				minute: "2-digit",
			}).format(date)}`
			: "Hoje";
	}

	if (tomorrow) {
		return includeHour
			? `Amanhã, ${new Intl.DateTimeFormat("pt-BR", {
				timeZone: "America/Sao_Paulo",
				hour: "2-digit",
				minute: "2-digit",
			}).format(date)}`
			: "Amanhã";
	}

	const formatOptions: Intl.DateTimeFormatOptions = {
		timeZone: "America/Sao_Paulo",
	};
	if (includeDay) {
		formatOptions.day = longMonth ? "2-digit" : "numeric";
		formatOptions.month = longMonth ? "long" : "2-digit";
	}
	if (includeHour) {
		formatOptions.hour = "2-digit";
		formatOptions.minute = "2-digit";
	}

	return new Intl.DateTimeFormat(locale, formatOptions).format(new Date(date)).replace(", ", ", às ");
}