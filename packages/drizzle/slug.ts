export function slugify(text: string, separator = "-") {
	return text
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, separator)
		.replace(new RegExp(`^\\${separator}+|\\${separator}+$`, "g"), "");
}
