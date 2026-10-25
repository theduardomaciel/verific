/**
 * Simple fuzzy search utilities for client-side filtering
 * Based on a lightweight algorithm for matching strings with typos/partial matches
 */

/**
 * Normalizes a string for comparison: lowercase, remove accents
 */
export function normalizeString(str: string): string {
	return str
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, ""); // Remove diacritics
}

/**
 * Checks if a string contains all characters of the query in order
 * (subsequence matching - allows fuzzy matching)
 */
export function isSubsequence(query: string, target: string): boolean {
	if (!query) return true;
	if (!target) return false;

	const normalizedQuery = normalizeString(query);
	const normalizedTarget = normalizeString(target);

	let queryIndex = 0;
	for (
		let i = 0;
		i < normalizedTarget.length && queryIndex < normalizedQuery.length;
		i++
	) {
		if (normalizedTarget[i] === normalizedQuery[queryIndex]) {
			queryIndex++;
		}
	}
	return queryIndex === normalizedQuery.length;
}

/**
 * Calculates a simple similarity score between query and target
 * Higher score = better match
 * Used for ranking results
 */
export function fuzzyScore(query: string, target: string): number {
	if (!query) return 1;
	if (!target) return 0;

	const normalizedQuery = normalizeString(query);
	const normalizedTarget = normalizeString(target);

	// Exact match gets highest score
	if (normalizedTarget === normalizedQuery) return 100;

	// Starts with query gets high score
	if (normalizedTarget.startsWith(normalizedQuery)) return 90;

	// Contains query as word gets good score
	const wordRegex = new RegExp(`\\b${normalizedQuery}\\b`);
	if (wordRegex.test(normalizedTarget)) return 80;

	// Contains query as substring
	if (normalizedTarget.includes(normalizedQuery)) return 70;

	// Subsequence match (fuzzy)
	if (isSubsequence(normalizedQuery, normalizedTarget)) return 50;

	return 0;
}

/**
 * Filters an array of items using fuzzy search on a specified key
 * Returns items sorted by relevance (best matches first)
 */
export function fuzzyFilter<T>(
	items: T[],
	query: string,
	getSearchText: (item: T) => string,
): T[] {
	if (!query) return items;

	return items
		.map((item) => ({
			item,
			score: fuzzyScore(query, getSearchText(item)),
		}))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score)
		.map(({ item }) => item);
}

/**
 * Simple fuzzy filter for arrays of strings
 */
export function fuzzyFilterStrings(strings: string[], query: string): string[] {
	if (!query) return strings;

	return strings
		.map((str) => ({ str, score: fuzzyScore(query, str) }))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score)
		.map(({ str }) => str);
}
