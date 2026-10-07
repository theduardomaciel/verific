export function toCsv(columns: string[], rows: string[][]): string {
	const escape = (v: string) => {
		if (
			v.includes('"') ||
			v.includes(",") ||
			v.includes("\n") ||
			v.includes(";")
		) {
			return `"${v.replace(/"/g, '""')}"`;
		}
		return v;
	};
	return [columns, ...rows].map((r) => r.map(escape).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string) {
	const blob = new Blob(["\uFEFF" + csv], {
		type: "text/csv;charset=utf-8;",
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
