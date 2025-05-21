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
