const now = new Date();

// Verifica se a atividade está ao vivo ou começando em breve
export const isLive = (date: Date): boolean => {
	return date.getTime() <= Date.now();
};
export const isStartingSoon = (date: Date): boolean => {
	return !isLive(date) && date.getTime() - Date.now() <= 5 * 60 * 1000; // 5 minutos
};
export const isToday = (date: Date): boolean => {
	return date.toDateString() === now.toDateString();
};

export function formatFriendlyDate(date: Date, includeDay?: boolean, includeHour?: boolean): string {
	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();
	const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

	if (isToday) {
		return includeHour
			? `Hoje, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
			: "Hoje";
	}

	if (isTomorrow) {
		return includeHour
			? `Amanhã, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
			: "Amanhã";
	}

	const options: Intl.DateTimeFormatOptions = {};
	if (includeDay) {
		options.day = "2-digit";
		options.month = "long";
	}
	if (includeHour) {
		options.hour = "2-digit";
		options.minute = "2-digit";
	}

	return date.toLocaleString("pt-BR", options).replace(", ", " ");
}
