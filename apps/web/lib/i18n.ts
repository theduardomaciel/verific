export function pluralize(count: number, singular: string, plural: string): string {
    return count === 1 ? singular : plural;
}

export function listToString(items: string[]): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0] ?? '';
    return items.slice(0, -1).join(', ') + ' e ' + items[items.length - 1];
}

export function getInitials(name?: string | null): string | undefined {
    return name
        ?.replace(/[^a-zA-Z0-9 ]/g, "") // Remove non-alphanumerical except spaces
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join("");
}