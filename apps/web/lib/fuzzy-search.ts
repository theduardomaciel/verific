/**
 * Fuzzy search utilities for client-side filtering.
 *
 * Primary text (e.g. title) matching tiers (higher score = better match):
 *  100  exact match
 *   90  target starts with query
 *   80  query matches whole word(s) in target
 *   75  query is a prefix of a word in target
 *   70  query is a substring of target
 *  50-69 every query token matches a target word (exact / prefix / substring / typo)
 *  30-45 compact subsequence match (last resort, queries >= 3 chars only)
 *    0  no match
 *
 * Secondary text (e.g. description) is matched strictly: whole words or
 * word prefixes only, and the score is capped at SECONDARY_MAX_SCORE so
 * title matches always rank first.
 */

const MIN_SUBSEQUENCE_QUERY_LENGTH = 3;
/** Max span of matched region = query length * this factor */
const MAX_SUBSEQUENCE_SPAN_FACTOR = 2;
/** Minimum query length for prefix matches inside long secondary text */
const MIN_SECONDARY_QUERY_LENGTH = 3;
/** Secondary-text matches never outrank primary-text fuzzy matches */
const SECONDARY_MAX_SCORE = 29;

/**
 * Normalizes a string for comparison: lowercase, remove accents, collapse spaces
 */
export function normalizeString(str: string): string {
	return str
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "") // Remove diacritics
		.replace(/\s+/g, " ")
		.trim();
}

function tokenize(normalized: string): string[] {
	return normalized.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/**
 * Returns the fraction of query characters found in order inside target
 * (loose subsequence ratio, no locality constraint).
 */
export function getSubsequenceMatchRatio(
	query: string,
	target: string,
): number {
	if (!query) return 1;
	if (!target) return 0;

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
	return queryIndex / normalizedQuery.length;
}

/**
 * Checks whether the query is a subsequence of the target.
 * Default is strict (100% of characters must appear in order).
 */
export function isSubsequence(
	query: string,
	target: string,
	minRatio = 1,
): boolean {
	return getSubsequenceMatchRatio(query, target) >= minRatio;
}

/**
 * Edit distance with adjacent transpositions (optimal string alignment).
 */
function editDistance(a: string, b: string): number {
	if (a === b) return 0;
	const al = a.length;
	const bl = b.length;
	if (!al) return bl;
	if (!bl) return al;

	const d: number[][] = Array.from({ length: al + 1 }, () =>
		new Array(bl + 1).fill(0),
	);
	for (let i = 0; i <= al; i++) d[i]![0] = i;
	for (let j = 0; j <= bl; j++) d[0]![j] = j;

	for (let i = 1; i <= al; i++) {
		for (let j = 1; j <= bl; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			d[i]![j] = Math.min(
				d[i - 1]![j]! + 1,
				d[i]![j - 1]! + 1,
				d[i - 1]![j - 1]! + cost,
			);
			if (
				i > 1 &&
				j > 1 &&
				a[i - 1] === b[j - 2] &&
				a[i - 2] === b[j - 1]
			) {
				d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
			}
		}
	}
	return d[al]![bl]!;
}

/** How many typos we tolerate for a query token of the given length */
function maxTypos(length: number): number {
	if (length <= 3) return 0;
	if (length <= 5) return 1;
	return 2;
}

/**
 * Scores one query token against the words of the target (0 = no match, 1 = exact word).
 * When `fuzzy` is false, only exact words and word prefixes count.
 */
function tokenMatchScore(
	queryToken: string,
	targetWords: string[],
	fuzzy: boolean,
): number {
	const allowed = fuzzy ? maxTypos(queryToken.length) : 0;
	let best = 0;

	for (const word of targetWords) {
		if (word === queryToken) return 1;

		if (word.startsWith(queryToken)) {
			best = Math.max(best, 0.85);
		} else if (
			fuzzy &&
			queryToken.length >= 2 &&
			word.includes(queryToken)
		) {
			best = Math.max(best, 0.6);
		} else if (allowed > 0 && best < 0.5) {
			const wholeWord = editDistance(queryToken, word) <= allowed;
			const asPrefix =
				word.length > queryToken.length &&
				editDistance(queryToken, word.slice(0, queryToken.length)) <=
					allowed;
			if (wholeWord || asPrefix) best = Math.max(best, 0.5);
		}
	}
	return best;
}

/**
 * Compact subsequence match: all query characters must appear in order,
 * starting at a word boundary, within a limited span.
 * Returns 0..1 (compactness) or 0 for no match.
 */
function compactSubsequenceRatio(query: string, target: string): number {
	const q = query.replace(/\s+/g, "");
	if (q.length < MIN_SUBSEQUENCE_QUERY_LENGTH) return 0;

	const maxSpan = q.length * MAX_SUBSEQUENCE_SPAN_FACTOR;
	let best = 0;

	for (let start = 0; start < target.length; start++) {
		if (target[start] !== q[0]) continue;
		if (start > 0 && /[\p{L}\p{N}]/u.test(target[start - 1]!)) continue; // word starts only

		let qi = 1;
		let end = start;
		for (let i = start + 1; i < target.length && qi < q.length; i++) {
			if (target[i] === q[qi]) {
				qi++;
				end = i;
			}
		}
		if (qi < q.length) continue;

		const span = end - start + 1;
		if (span <= maxSpan) best = Math.max(best, q.length / span);
	}
	return best;
}

/** Fuzzy scoring, meant for short text such as titles. */
function scorePrimary(q: string, qTokens: string[], t: string): number {
	if (!q) return 1;
	if (!t) return 0;

	if (t === q) return 100;
	if (t.startsWith(q)) return 90;

	const tTokens = tokenize(t);
	const qJoined = qTokens.join(" ");
	const tJoined = tTokens.join(" ");

	// Query matches whole word(s)
	if (qJoined && ` ${tJoined} `.includes(` ${qJoined} `)) return 80;

	// Query is a prefix of a word (or word sequence) in target
	if (qJoined && ` ${tJoined}`.includes(` ${qJoined}`)) return 75;

	// Plain substring
	if (t.includes(q)) return 70;

	// Every query token must match some target word
	if (qTokens.length > 0) {
		let total = 0;
		let allMatched = true;
		for (const token of qTokens) {
			const s = tokenMatchScore(token, tTokens, true);
			if (s === 0) {
				allMatched = false;
				break;
			}
			total += s;
		}
		if (allMatched) {
			const avg = total / qTokens.length; // 0.5..1
			return 50 + Math.floor(avg * 19);
		}
	}

	// Last resort: compact subsequence ("ctrl" -> "control")
	const ratio = compactSubsequenceRatio(q, t);
	if (ratio > 0) return 30 + Math.floor(ratio * 15);

	return 0;
}

/**
 * Strict scoring, meant for long text such as descriptions:
 * every query token must be a whole word or a word prefix. No typos,
 * no loose substrings, no subsequence.
 */
function scoreSecondary(q: string, qTokens: string[], t: string): number {
	if (!q || !t || q.length < MIN_SECONDARY_QUERY_LENGTH) return 0;
	if (qTokens.length === 0) return 0;

	const tTokens = tokenize(t);
	let total = 0;

	for (const token of qTokens) {
		// Ignore tiny tokens ("de", "o") so they can't match everything
		if (token.length < 2) return 0;
		const s = tokenMatchScore(token, tTokens, false);
		if (s === 0) return 0;
		total += s;
	}

	const avg = total / qTokens.length; // 0.85..1
	return Math.max(1, Math.floor(avg * SECONDARY_MAX_SCORE));
}

/**
 * Calculates a similarity score between query and target (fuzzy, for short text).
 * Higher score = better match, 0 = no match.
 */
export function fuzzyScore(query: string, target: string): number {
	const q = normalizeString(query);
	return scorePrimary(q, tokenize(q), normalizeString(target));
}

/**
 * Filters an array of items using fuzzy search.
 * - getSearchText: short, high-signal text (title). Matched fuzzily.
 * - getSecondaryText: optional long text (description, category...).
 *   Matched strictly (whole words / prefixes) and ranked below title matches.
 * Returns items sorted by relevance (best matches first).
 */
export function fuzzyFilter<T>(
	items: T[],
	query: string,
	getSearchText: (item: T) => string,
	getSecondaryText?: (item: T) => string,
): T[] {
	const q = normalizeString(query);
	if (!q) return items;
	const qTokens = tokenize(q);

	return items
		.map((item) => {
			const primary = scorePrimary(
				q,
				qTokens,
				normalizeString(getSearchText(item)),
			);
			const secondary = getSecondaryText
				? scoreSecondary(
						q,
						qTokens,
						normalizeString(getSecondaryText(item)),
					)
				: 0;
			return { item, score: Math.max(primary, secondary) };
		})
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score)
		.map(({ item }) => item);
}

/**
 * Simple fuzzy filter for arrays of strings
 */
export function fuzzyFilterStrings(strings: string[], query: string): string[] {
	return fuzzyFilter(strings, query, (s) => s);
}
