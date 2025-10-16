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