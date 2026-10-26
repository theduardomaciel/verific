import { useSyncExternalStore } from "react";

import { saoPauloDayKey } from "@/lib/date";

const MINUTE = 60_000;
let now: Date | null = null;
let today: Date | null = null;

function getNow() {
	const current = Date.now();
	if (!now || current - now.getTime() >= MINUTE) now = new Date(current);
	return now;
}

function getToday() {
	const current = getNow();
	if (!today || saoPauloDayKey(today) !== saoPauloDayKey(current)) {
		today = current;
	}
	return today;
}

function subscribe(onChange: () => void) {
	const id = setInterval(onChange, MINUTE);
	return () => clearInterval(id);
}

const onServer = () => null;

/**
 * Hora atual, atualizada a cada minuto. `null` no servidor e na hidratação:
 * o que depende de "agora" não fica congelado no HTML estático.
 */
export function useNow(): Date | null {
	return useSyncExternalStore(subscribe, getNow, onServer);
}

/** Como `useNow`, mas só muda quando o dia (em Brasília) muda. */
export function useToday(): Date | null {
	return useSyncExternalStore(subscribe, getToday, onServer);
}
