import { render, Section, Text } from "react-email";

import { z } from "@verific/zod";

import { EmailCta, EmailLayout, emailStyles } from "./layout";

import type { RenderedTemplate } from "../templates";

export const EVENT_REGISTRATION_CONFIRMATION_VERSION = "v3" as const;

// Re-exported for backwards compatibility (moved to `./layout`).
export { sanitizeLogoUrl } from "./layout";

export const eventRegistrationConfirmationPayloadSchema = z.object({
	participantName: z.string().trim().min(1),
	eventName: z.string().trim().min(1),
	eventDateText: z.string().trim().optional(),
	eventLocation: z.string().trim().optional(),
	accessUrl: z
		.url()
		.refine(
			(url) => url.startsWith("http://") || url.startsWith("https://"),
			"accessUrl must be an absolute http(s) URL",
		),
	// Logo. Only the dark-mode wide logo is ever passed (the template is
	// dark-only); the PNG is produced by the client upload pipeline, so no
	// server-side conversion is needed. When absent, the event name shows.
	logoUrl: z.string().optional(),
	// Optional intrinsic size. Unused for layout (the logo keeps `height:
	// auto`), kept optional so payloads that carry it keep rendering.
	logoWidth: z.number().int().positive().optional(),
	logoHeight: z.number().int().positive().optional(),
	// Alt text override. Defaults to the event name.
	logoAlt: z.string().trim().optional(),
});

export type EventRegistrationConfirmationPayload = z.infer<
	typeof eventRegistrationConfirmationPayloadSchema
>;

export type EventRegistrationConfirmationProps =
	EventRegistrationConfirmationPayload;

export const eventRegistrationConfirmationSubject = (props: {
	eventName: string;
}) => `Inscrição confirmada: ${props.eventName}`;

export function EventRegistrationConfirmationEmail({
	participantName,
	eventName,
	eventDateText,
	eventLocation,
	accessUrl,
	logoUrl,
	logoAlt,
}: EventRegistrationConfirmationProps) {
	const subject = eventRegistrationConfirmationSubject({ eventName });
	const hasDetails = Boolean(eventDateText || eventLocation);
	return (
		<EmailLayout
			eventName={eventName}
			preview={subject}
			logoUrl={logoUrl}
			logoAlt={logoAlt}
		>
			<Text style={emailStyles.badge}>Inscrição confirmada</Text>
			<Text style={emailStyles.title}>{eventName}</Text>
			<Text style={emailStyles.greeting}>Olá, {participantName}!</Text>
			<Text style={emailStyles.paragraph}>
				Sua inscrição em <strong>{eventName}</strong> foi confirmada.
				Use o botão abaixo para acessar sua inscrição quando precisar.
			</Text>
			{hasDetails ? (
				<Section style={emailStyles.panel}>
					{eventDateText ? (
						<>
							<Text style={emailStyles.metaLabel}>Data</Text>
							<Text style={emailStyles.metaValue}>
								{eventDateText}
							</Text>
						</>
					) : null}
					{eventLocation ? (
						<>
							<Text
								style={{
									...emailStyles.metaLabel,
									...(eventDateText
										? emailStyles.metaLabelSpaced
										: null),
								}}
							>
								Local
							</Text>
							<Text style={emailStyles.metaValue}>
								{eventLocation}
							</Text>
						</>
					) : null}
				</Section>
			) : null}
			<EmailCta href={accessUrl} label="Acessar minha inscrição" />
		</EmailLayout>
	);
}

export async function renderEventRegistrationConfirmation(
	props: unknown,
): Promise<RenderedTemplate> {
	const parsed = eventRegistrationConfirmationPayloadSchema.parse(props);
	const element = <EventRegistrationConfirmationEmail {...parsed} />;
	const [html, text] = await Promise.all([
		render(element),
		render(element, { plainText: true }),
	]);
	return {
		subject: eventRegistrationConfirmationSubject(parsed),
		html,
		text,
		templateVersion: EVENT_REGISTRATION_CONFIRMATION_VERSION,
	};
}

/**
 * Preview props for `react-email dev`: shows the logo case (a dark-mode wide
 * logo PNG, as the upload pipeline stores). Remove `logoUrl` to preview the
 * event-name fallback.
 */
export const eventRegistrationConfirmationPreviewProps: EventRegistrationConfirmationProps =
	{
		participantName: "Maria Silva",
		eventName: "SECOMP 2026",
		eventDateText: "12 de abril de 2026, 14:00 – 18:00",
		eventLocation: "Campus A. C. Simões, Maceió – AL",
		accessUrl: "https://example.com/secomp-2026/profile/abc123?me=1",
		logoUrl: "https://example.com/secomp-logo-dark.png",
		logoWidth: 768,
		logoHeight: 125,
		logoAlt: "SECOMP 26",
	};

export default function EventRegistrationConfirmationPreview() {
	return (
		<EventRegistrationConfirmationEmail
			{...eventRegistrationConfirmationPreviewProps}
		/>
	);
}
