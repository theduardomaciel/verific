import { describe, expect, it, vi } from "vitest";

vi.mock("@verific/drizzle", () => ({ db: {} }));
vi.mock("@verific/env", () => ({ env: {} }));

import {
	eventRegistrationConfirmationPreviewProps,
	renderEventRegistrationConfirmation,
	sanitizeLogoUrl,
} from "./event-registration-confirmation";

import type { EventRegistrationConfirmationProps } from "./event-registration-confirmation";

const PROPS: EventRegistrationConfirmationProps = {
	participantName: "Maria Silva",
	eventName: "Secomp UFAL 2026",
	eventDateText: "12 de abril de 2026, 14:00 – 18:00",
	eventLocation: "Campus A. C. Simões, Maceió – AL",
	accessUrl: "https://example.com/secomp-2026/profile/abc123?me=1",
	logoUrl: "https://example.com/logo.png",
};

describe("event_registration_confirmation template", () => {
	it("renders html and text containing name, event and access url", async () => {
		const rendered = await renderEventRegistrationConfirmation(PROPS);

		expect(rendered.templateVersion).toBe("v2");
		expect(rendered.subject).toBe("Inscrição confirmada: Secomp UFAL 2026");
		expect(rendered.html).toContain("Maria Silva");
		expect(rendered.html).toContain("Secomp UFAL 2026");
		expect(rendered.html).toContain(
			"https://example.com/secomp-2026/profile/abc123?me=1",
		);
		expect(rendered.html).toContain("Acessar minha inscrição");
		expect(rendered.text.length).toBeGreaterThan(0);
		expect(rendered.text).toContain("Maria Silva");
		expect(rendered.text).toContain(
			"https://example.com/secomp-2026/profile/abc123?me=1",
		);
	});

	it("renders the preview props without throwing", async () => {
		await expect(
			renderEventRegistrationConfirmation(
				eventRegistrationConfirmationPreviewProps,
			),
		).resolves.toMatchObject({ templateVersion: "v2" });
	});

	it("omits date and location lines when not provided", async () => {
		const rendered = await renderEventRegistrationConfirmation({
			participantName: "João",
			eventName: "Workshop",
			accessUrl: "https://example.com/w/profile/x?me=1",
		});

		expect(rendered.html).not.toContain("Data:");
		expect(rendered.html).not.toContain("Local:");
		expect(rendered.html).toContain("Sua inscrição em");
	});

	it("shows the logo image when the url is email-safe, else the event name", async () => {
		const withLogo = await renderEventRegistrationConfirmation(PROPS);
		expect(withLogo.html).toContain('src="https://example.com/logo.png"');
		expect(withLogo.html).toContain('alt="Secomp UFAL 2026"');

		const withoutLogo = await renderEventRegistrationConfirmation({
			...PROPS,
			logoUrl: undefined,
		});
		expect(withoutLogo.html).not.toContain("<img");
	});

	it("uses the logoAlt override when provided", async () => {
		const rendered = await renderEventRegistrationConfirmation({
			...PROPS,
			logoUrl: "https://example.com/logo_blue.png",
			logoAlt: "verifIC",
		});

		expect(rendered.html).toContain('alt="verifIC"');
	});

	it("rejects invalid payloads instead of rendering", async () => {
		await expect(
			renderEventRegistrationConfirmation({
				participantName: "",
				eventName: "X",
				accessUrl: "https://example.com/x",
			}),
		).rejects.toThrow();
		await expect(
			renderEventRegistrationConfirmation({
				participantName: "Ana",
				eventName: "X",
				accessUrl: "not-a-url",
			}),
		).rejects.toThrow();
	});
});

describe("sanitizeLogoUrl", () => {
	it.each([
		["https://example.com/logo.png", "https://example.com/logo.png"],
		["http://example.com/logo.png", undefined],
		["https://example.com/logo.svg", undefined],
		["https://example.com/logo.svg?x=1", undefined],
		["/relative/logo.png", undefined],
		[undefined, undefined],
	])("sanitizes %s", (input, expected) => {
		expect(sanitizeLogoUrl(input)).toBe(expected);
	});
});
