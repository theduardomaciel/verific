"use client";

import { createContext, use } from "react";

const EventTimeZoneContext = createContext<string | null>(null);

/** Fuso do evento para os componentes de cliente abaixo. */
export function EventTimeZoneProvider({
	timeZone,
	children,
}: {
	timeZone: string;
	children: React.ReactNode;
}) {
	return (
		<EventTimeZoneContext value={timeZone}>{children}</EventTimeZoneContext>
	);
}

export function useEventTimeZone(): string {
	const timeZone = use(EventTimeZoneContext);
	if (!timeZone) {
		throw new Error(
			"useEventTimeZone must be used within EventTimeZoneProvider",
		);
	}
	return timeZone;
}
