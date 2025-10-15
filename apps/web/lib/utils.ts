import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function extractGoogleSheetId(url: string) {
	const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
	const match = url.match(regex);
	return match ? match[1] : null;
}