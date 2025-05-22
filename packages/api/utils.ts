export const transformSingleToArray = <T>(
	value: T | T[] | undefined,
): T[] | undefined => {
	if (value && Array.isArray(value)) {
		// console.log("Retornando a própria array", value);
		return value;
	}

	if (typeof value === "string") {
		const splitted = value.split(",").map((v) => v.trim() as unknown as T);
		// console.log("Transformando string para array", splitted);
		return splitted;
	}

	if (value !== undefined) {
		// console.log("Transformando valor único para array", value);
		return [value];
	}

	return undefined;
};
