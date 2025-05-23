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

export function formatFriendlyDate(date: Date, includeDay?: boolean): string {
	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();

	if (isToday) {
		return `Hoje, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
	}

	return date.toLocaleString("pt-BR", {
		month: includeDay ? "long" : undefined,
		day: includeDay ? "2-digit" : undefined,
		hour: "2-digit",
		minute: "2-digit",
	});
}
