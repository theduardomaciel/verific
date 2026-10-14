import type { NotificationType } from "./types";

export interface RenderedTemplate {
	subject: string;
	html: string;
	text: string;
	templateVersion: string;
}

export interface TemplateDefinition {
	version: string;
	render(
		payload: Record<string, unknown>,
	): RenderedTemplate | Promise<RenderedTemplate>;
}

/**
 * Template registry keyed by notification type. To add a type: extend
 * `NotificationType`, type its payload, and add an entry here. The real
 * `event_registration_confirmation` template lands in a follow-up; the stub
 * below keeps the service testable end to end meanwhile.
 */
const eventRegistrationConfirmationStub: TemplateDefinition = {
	version: "v0-stub",
	render(payload) {
		const eventName =
			typeof payload["eventName"] === "string"
				? payload["eventName"]
				: "evento";
		const subject = `Confirmação de inscrição: ${eventName}`;
		const text = `Sua inscrição em ${eventName} foi confirmada. (modelo provisório)`;
		const html = `<p>Sua inscrição em <strong>${escapeHtml(eventName)}</strong> foi confirmada. (modelo provisório)</p>`;
		return { subject, html, text, templateVersion: "v0-stub" };
	},
};

export const templateRegistry: Record<NotificationType, TemplateDefinition> = {
	event_registration_confirmation: eventRegistrationConfirmationStub,
};

export async function renderTemplate(
	type: string,
	payload: Record<string, unknown>,
): Promise<RenderedTemplate> {
	const definition = (
		templateRegistry as Record<string, TemplateDefinition | undefined>
	)[type];
	if (!definition) {
		throw new Error(
			`No template registered for notification type "${type}".`,
		);
	}
	return definition.render(payload);
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}
