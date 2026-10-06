"use client";

import { useMemo } from "react";
import {
	filterVisibleFields,
	getVisibleSectionIds,
	type SectionForVisibility,
} from "@verific/api/schemas";
import { groupFieldsBySection } from "./layout";

interface VisibleField {
	id: string;
	key: string;
	order: number;
	sectionId?: string | null;
	halfWidth?: boolean | null;
}

interface VisibleSection {
	id: string;
	title: string;
	order: number;
	visibilityRule?: SectionForVisibility["visibilityRule"];
}

/**
 * Filters sections/fields by conditional visibility rules.
 * Hidden sections keep values in-memory; callers must strip them on submit
 * (server re-validates authoritatively).
 */
export function useVisibleSections<
	F extends VisibleField,
	S extends VisibleSection,
>(fields: F[], sections: S[], answers: Record<string, unknown>) {
	return useMemo(() => {
		if (!sections.some((s) => s.visibilityRule)) {
			return { visibleSections: sections, visibleFields: fields, visibleIds: new Set(sections.map((s) => s.id)) };
		}
		const visibleIds = getVisibleSectionIds(sections, fields, answers);
		return {
			visibleSections: sections.filter((s) => visibleIds.has(s.id)),
			visibleFields: filterVisibleFields(fields, sections, answers) as F[],
			visibleIds,
		};
	}, [fields, sections, answers]);
}

export function useGroupedVisibleSections<
	F extends VisibleField,
	S extends VisibleSection,
>(fields: F[], sections: S[], answers: Record<string, unknown>) {
	const { visibleSections, visibleFields } = useVisibleSections(fields, sections, answers);
	return useMemo(
		() => groupFieldsBySection(visibleFields, visibleSections),
		[visibleFields, visibleSections],
	);
}
