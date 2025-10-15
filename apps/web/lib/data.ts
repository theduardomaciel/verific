// Verifica se a atividade está ao vivo ou começando em breve
export const isLive = (date: Date): boolean => {
	return date.getTime() <= Date.now();
};
export const isStartingSoon = (date: Date): boolean => {
	return !isLive(date) && date.getTime() - Date.now() <= 5 * 60 * 1000; // 5 minutos
};
export const isToday = (date: Date): boolean => {
	return date.toDateString() === new Date().toDateString();
};

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
			? `Hoje, ${date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`
			: "Hoje";
	}

	if (isTomorrow) {
		return includeHour
			? `Amanhã, ${date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`
			: "Amanhã";
	}

	const formatOptions: Intl.DateTimeFormatOptions = {};
	if (includeDay) {
		formatOptions.day = longMonth ? "2-digit" : "numeric";
		formatOptions.month = longMonth ? "long" : "2-digit";
	}
	if (includeHour) {
		formatOptions.hour = "2-digit";
		formatOptions.minute = "2-digit";
	}

	return date.toLocaleString(locale, formatOptions).replace(", ", ", às ");
}
