// Date and time functions
const saoPauloFormatter = new Intl.DateTimeFormat("pt-BR", {
	timeZone: "America/Sao_Paulo",
	dateStyle: "short",
	timeStyle: "short",
});

export const isDateDifferent = (date1: Date, date2: Date) => {
	return (
		date1.getDate() !== date2.getDate() ||
		date1.getMonth() !== date2.getMonth() ||
		date1.getFullYear() !== date2.getFullYear()
	);
};

export const getDateString = (event: { dateFrom: Date; dateTo: Date }) => {
	const dateString = `${saoPauloFormatter.format(event.dateFrom).split(' ')[0]}${isDateDifferent(event.dateFrom, event.dateTo)
		? ` - ${saoPauloFormatter.format(event.dateTo).split(' ')[0]}`
		: ""
		}`;

	return dateString;
};

export const getTimeString = (date: Date) => {
	return saoPauloFormatter.format(date).split(' ')[1];
};

export const isBeforeStart = (startDate: Date) => {
	return new Date() < startDate;
}

export const isAfterEnd = (endDate: Date) => {
	return new Date() > endDate;
}

export const isLive = (date: Date): boolean => {
	return date.getTime() <= Date.now();
};
export const isStartingSoon = (date: Date): boolean => {
	return !isLive(date) && date.getTime() - Date.now() <= 5 * 60 * 1000; // 5 minutos
};
export const isToday = (date: Date): boolean => {
	return date.toDateString() === new Date().toDateString();
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

export function formatFriendlyDate(date: Date, options?: FriendlyDateOptions): string {
	const {
		includeDay = true,
		includeHour = false,
		longMonth = false,
		locale = "pt-BR",
	} = options || {};

	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();
	const isTomorrow =
		date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

	if (isToday) {
		return includeHour
			? `Hoje, ${new Intl.DateTimeFormat("pt-BR", {
				timeZone: "America/Sao_Paulo",
				hour: "2-digit",
				minute: "2-digit",
			}).format(date)}`
			: "Hoje";
	}

	if (isTomorrow) {
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

	return new Intl.DateTimeFormat(locale, formatOptions).format(date).replace(", ", ", às ");
}