export interface RowGroupable {
	id: string;
	halfWidth?: boolean | null;
}

export interface FieldRow<T extends RowGroupable> {
	fields: T[];
	/** True when a half-width field ended up alone. Render it full-width so the layout never breaks. */
	orphan: boolean;
}

/**
 * Groups an order-sorted field list into visual rows of max 2.
 *
 * - Full-width fields always occupy their own row.
 * - Consecutive half-width fields are paired greedily: [H,H] per row.
 * - An odd half-width out (single H between fulls, or trailing H of an
 *   odd run like H,H,H) forms an orphan row — render it full-width so a
 *   half is never left alone in a broken half-empty row.
 */
export function groupFieldsIntoRows<T extends RowGroupable>(fields: T[]): FieldRow<T>[] {
	const rows: FieldRow<T>[] = [];
	let i = 0;
	while (i < fields.length) {
		const current = fields[i]!;
		if (!current.halfWidth) {
			rows.push({ fields: [current], orphan: false });
			i += 1;
			continue;
		}
		const next = fields[i + 1];
		if (next && next.halfWidth) {
			rows.push({ fields: [current, next], orphan: false });
			i += 2;
		} else {
			rows.push({ fields: [current], orphan: true });
			i += 1;
		}
	}
	return rows;
}

/** Ids of half-width fields that ended up alone in their row. */
export function findOrphanHalfIds<T extends RowGroupable>(fields: T[]): Set<string> {
	const orphans = new Set<string>();
	for (const row of groupFieldsIntoRows(fields)) {
		if (row.orphan) {
			for (const f of row.fields) orphans.add(f.id);
		}
	}
	return orphans;
}

export interface SectionGroupable {
	id: string;
	title: string;
	order: number;
}

export interface FieldWithSection extends RowGroupable {
	order: number;
	sectionId?: string | null;
}

export interface SectionGroup<S extends SectionGroupable, F extends FieldWithSection> {
	section: S;
	fields: F[];
	rows: FieldRow<F>[];
}

/**
 * Groups order-sorted fields into their sections (ordered by section.order).
 * Fields with a missing/null sectionId fall back to the first section so
 * legacy data never disappears from the UI.
 */
export function groupFieldsBySection<S extends SectionGroupable, F extends FieldWithSection>(
	fields: F[],
	sections: S[],
): SectionGroup<S, F>[] {
	const sortedSections = [...sections].sort((a, b) => a.order - b.order);
	const sortedFields = [...fields].sort((a, b) => a.order - b.order);
	const bySection = new Map<string, F[]>();
	for (const f of sortedFields) {
		const key = f.sectionId ?? sortedSections[0]?.id ?? "__ungrouped__";
		if (!bySection.has(key)) bySection.set(key, []);
		bySection.get(key)!.push(f);
	}
	return sortedSections.map((section) => {
		const sectionFields = bySection.get(section.id) ?? [];
		return { section, fields: sectionFields, rows: groupFieldsIntoRows(sectionFields) };
	});
}
