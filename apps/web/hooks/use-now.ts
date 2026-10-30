import { useCallback, useSyncExternalStore } from "react";

import { dayKey } from "@verific/drizzle/time";

const MINUTE = 60_000;
let now: Date | null = null;
const todayByZone = new Map<string, Date>();

function getNow() {
	const current = Date.now();
	if (!now || current - now.getTime() >= MINUTE) now = new Date(current);
	return now;
}

function getToday(timeZone: string) {
	const current = getNow();
	const today = todayByZone.get(timeZone);
	if (today && dayKey(today, timeZone) === dayKey(current, timeZone)) {
		return today;
	}
	todayByZone.set(timeZone, current);
	return current;
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

/** Como `useNow`, mas só muda quando o dia muda no fuso. */
export function useToday(timeZone: string): Date | null {
	const getSnapshot = useCallback(() => getToday(timeZone), [timeZone]);
	return useSyncExternalStore(subscribe, getSnapshot, onServer);
}
