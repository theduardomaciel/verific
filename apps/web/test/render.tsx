import { render } from "@testing-library/react";

import { DEFAULT_TIME_ZONE } from "@verific/drizzle/time";

import { EventTimeZoneProvider } from "@/components/event-time-zone";

/** Renderiza dentro do provider de fuso, como nas páginas de evento. */
export function renderInEventTimeZone(ui: React.ReactElement) {
	return render(ui, {
		wrapper: ({ children }) => (
			<EventTimeZoneProvider timeZone={DEFAULT_TIME_ZONE}>
				{children}
			</EventTimeZoneProvider>
		),
	});
}
