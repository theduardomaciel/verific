export function formatPhone(value: string) {
	value = value.replace(/\D/g, ""); // Remove tudo que não for número
	if (value.length > 11) value = value.slice(0, 11); // Limita a 11 dígitos
	if (value.length > 6) {
		// (99) 99999-9999
		return `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
	} else if (value.length > 2) {
		// (99) 99999
		return `(${value.slice(0, 2)}) ${value.slice(2)}`;
	} else if (value.length > 0) {
		// (99
		return `(${value}`;
	}
	return value;
}

/**
 * Brasil-only helpers: the stored canonical form is E.164 (`+55...`),
 * the visual mask (`formatPhone`) operates on the national digits.
 * See DOCS/i18n.md.
 */

/** Strips the `+55` country code of an E.164 value, returning national digits. */
export function toNationalBR(value: string): string {
	return value.replace(/\D/g, "").replace(/^55/, "");
}

/** Normalizes typed/pasted text (national or E.164) to E.164, or `""` when empty. */
export function toE164BR(text: string): string {
	const digits = text.replace(/\D/g, "");
	if (!digits) return "";
	if (digits.length > 11 && digits.startsWith("55")) return `+${digits}`;
	return `+55${digits}`;
}
