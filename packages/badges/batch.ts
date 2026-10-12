/** Split a batch into files of at most `perFile` badges. Pure. */
export interface BatchFile {
	fileIndex: number;
	start: number;
	count: number;
}

export function planBatchFiles(
	totalBadges: number,
	perFile = 500,
): BatchFile[] {
	if (!Number.isInteger(totalBadges) || totalBadges < 0) {
		throw new Error("Total de crachás inválido.");
	}
	if (!Number.isInteger(perFile) || perFile < 1) {
		throw new Error("Tamanho de arquivo inválido.");
	}
	const files: BatchFile[] = [];
	let start = 0;
	let fileIndex = 0;
	while (start < totalBadges) {
		const count = Math.min(perFile, totalBadges - start);
		files.push({ fileIndex, start, count });
		start += count;
		fileIndex++;
	}
	return files;
}
