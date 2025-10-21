import z from "@verific/zod";

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

// Helper function for enum array preprocessing
export const createEnumArraySchema = (enumValues: readonly string[]) =>
	z.preprocess(
		(val) => {
			if (typeof val === "string") {
				return val.split(",").map((v) => v.trim());
			}
			if (Array.isArray(val)) {
				return val;
			}
			if (val !== undefined) {
				return [val];
			}
			return val;
		},
		z.array(z.enum(enumValues as [string, ...string[]])),
	);

export const sortOptions = ["asc", "desc", "name_asc", "name_desc"] as const;
export const sortOptionsLabels = {
	asc: "Mais antigas",
	desc: "Mais recentes",
	name_asc: "Nome A-Z",
	name_desc: "Nome Z-A",
}