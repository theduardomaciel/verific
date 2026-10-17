import { getNotificationDefinition } from "./registry";

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
 * Renders a notification type from its rebuilt props. Kept as a thin
 * compatibility wrapper over the registry; new code should read from
 * `notifications/registry` (single source of truth).
 */
export async function renderTemplate(
	type: string,
	payload: Record<string, unknown>,
): Promise<RenderedTemplate> {
	const definition = getNotificationDefinition(type);
	if (!definition) {
		throw new Error(
			`No template registered for notification type "${type}".`,
		);
	}
	return definition.render(payload);
}
