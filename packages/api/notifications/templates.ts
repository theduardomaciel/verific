import {
	EVENT_REGISTRATION_CONFIRMATION_VERSION,
	renderEventRegistrationConfirmation,
} from "./emails/event-registration-confirmation";

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
 * `NotificationType`, type its payload, and add an entry here.
 */
const eventRegistrationConfirmation: TemplateDefinition = {
	version: EVENT_REGISTRATION_CONFIRMATION_VERSION,
	render: (payload) => renderEventRegistrationConfirmation(payload),
};

export const templateRegistry: Record<NotificationType, TemplateDefinition> = {
	event_registration_confirmation: eventRegistrationConfirmation,
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
