export const transformSingleToArray = (
	value: string | string[] | undefined,
): string[] | undefined => {
	if (value && Array.isArray(value)) {
		console.log("Retornando a própria array", value);
		return value;
	}

	const splitted = value
		?.toString()
		.split(",")
		.map((v) => v.trim());

	console.log("Transformando para array", splitted);

	return splitted ?? undefined;
};
