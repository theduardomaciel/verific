// Date and time functions
export const isDateDifferent = (date1: Date, date2: Date) => {
	return (
		date1.getDate() !== date2.getDate() ||
		date1.getMonth() !== date2.getMonth() ||
		date1.getFullYear() !== date2.getFullYear()
	);
};

export const getDateString = (event: { dateFrom: Date; dateTo: Date }) => {
	const dateString = `${event.dateFrom.toLocaleDateString("pt-BR", {
		month: "2-digit",
		day: "2-digit",
		year: event.dateTo ? undefined : "numeric",
	})}${isDateDifferent(event.dateFrom, event.dateTo)
			? ` - ${event.dateTo.toLocaleDateString("pt-BR", {
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			})}`
			: ""
		}`;

	return dateString;
};

export const getTimeString = (date: Date) => {
	return date.toLocaleTimeString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
	});
};

export const isBeforeStart = (startDate: Date) => {
	return new Date() < startDate;
}

export const isAfterEnd = (endDate: Date) => {
	return new Date() > endDate;
}