import { render, Section, Text } from "react-email";

import { z } from "@verific/zod";

import { EmailCta, EmailLayout, EmailReason, emailStyles } from "./layout";

import type { RenderedTemplate } from "../templates";

/** Fields shared by every activity e-mail. */
const activityBase = {
	participantName: z.string().trim().min(1),
	eventName: z.string().trim().min(1),
	activityName: z.string().trim().min(1),
	activityDateText: z.string().trim().optional(),
	activityLocation: z.string().trim().optional(),
	accessUrl: z
		.url()
		.refine(
			(url) => url.startsWith("http://") || url.startsWith("https://"),
			"accessUrl must be an absolute http(s) URL",
		),
	logoUrl: z.string().optional(),
	logoAlt: z.string().trim().optional(),
} as const;

const baseSchema = z.object(activityBase);

function ActivityDetails({
	dateText,
	location,
	dateLabel = "Data",
	locationLabel = "Local",
}: {
	dateText?: string;
	location?: string;
	dateLabel?: string;
	locationLabel?: string;
}) {
	if (!dateText && !location) return null;
	return (
		<Section style={emailStyles.panel}>
			{dateText ? (
				<>
					<Text style={emailStyles.metaLabel}>{dateLabel}</Text>
					<Text style={emailStyles.metaValue}>{dateText}</Text>
				</>
			) : null}
			{location ? (
				<>
					<Text
						style={{
							...emailStyles.metaLabel,
							...(dateText ? emailStyles.metaLabelSpaced : null),
						}}
					>
						{locationLabel}
					</Text>
					<Text style={emailStyles.metaValue}>{location}</Text>
				</>
			) : null}
		</Section>
	);
}

function ActivityEmailShell({
	badge,
	title,
	preview,
	props,
	children,
	ctaLabel,
}: {
	badge: string;
	title: string;
	preview: string;
	props: {
		eventName: string;
		participantName: string;
		accessUrl: string;
		logoUrl?: string;
		logoAlt?: string;
	};
	children: React.ReactNode;
	ctaLabel: string;
}) {
	return (
		<EmailLayout
			eventName={props.eventName}
			preview={preview}
			logoUrl={props.logoUrl}
			logoAlt={props.logoAlt}
		>
			<Text style={emailStyles.badge}>{badge}</Text>
			<Text style={emailStyles.title}>{title}</Text>
			<Text style={emailStyles.greeting}>
				Olá, {props.participantName}!
			</Text>
			{children}
			<EmailCta href={props.accessUrl} label={ctaLabel} />
		</EmailLayout>
	);
}

/* ------------------------------------------------------------------ */
/* activity_enrollment_confirmed                                       */
/* ------------------------------------------------------------------ */

export const ACTIVITY_ENROLLMENT_CONFIRMED_VERSION = "v1" as const;

export type ActivityEnrollmentConfirmedProps = z.infer<typeof baseSchema>;

export const activityEnrollmentConfirmedSubject = (props: {
	activityName: string;
	eventName: string;
}) => `Inscrição confirmada em ${props.activityName} – ${props.eventName}`;

export function ActivityEnrollmentConfirmedEmail(
	props: ActivityEnrollmentConfirmedProps,
) {
	return (
		<ActivityEmailShell
			badge="Inscrição confirmada"
			title={props.activityName}
			preview={activityEnrollmentConfirmedSubject(props)}
			props={props}
			ctaLabel="Ver atividade"
		>
			<Text style={emailStyles.paragraph}>
				Sua vaga em <strong>{props.activityName}</strong> está
				confirmada. Guarde os detalhes abaixo.
			</Text>
			<ActivityDetails
				dateText={props.activityDateText}
				location={props.activityLocation}
			/>
		</ActivityEmailShell>
	);
}

export async function renderActivityEnrollmentConfirmed(
	props: unknown,
): Promise<RenderedTemplate> {
	const parsed = baseSchema.parse(props);
	const element = <ActivityEnrollmentConfirmedEmail {...parsed} />;
	return renderBoth(
		element,
		activityEnrollmentConfirmedSubject(parsed),
		ACTIVITY_ENROLLMENT_CONFIRMED_VERSION,
	);
}

/** Sample props for `react-email dev` and registry previews. */
export const activityEnrollmentConfirmedPreviewProps: ActivityEnrollmentConfirmedProps =
	{
		participantName: "Maria Silva",
		eventName: "SECOMP 2026",
		activityName: "Oficina de React",
		activityDateText: "12 de abril de 2026, 14:00 – 18:00",
		activityLocation: "Laboratório 4",
		accessUrl: "https://example.com/secomp-2026/schedule/activity-1",
	};

/* ------------------------------------------------------------------ */
/* activity_waitlisted                                                 */
/* ------------------------------------------------------------------ */

export const ACTIVITY_WAITLISTED_VERSION = "v1" as const;

export const activityWaitlistedPayloadSchema = baseSchema.extend({
	/** 1 = next in line. Omitted when not cheaply known. */
	position: z.number().int().positive().optional(),
});
export type ActivityWaitlistedProps = z.infer<
	typeof activityWaitlistedPayloadSchema
>;

export const activityWaitlistedSubject = (props: {
	activityName: string;
	eventName: string;
}) =>
	`Você entrou na fila de espera: ${props.activityName} – ${props.eventName}`;

export function ActivityWaitlistedEmail(props: ActivityWaitlistedProps) {
	return (
		<ActivityEmailShell
			badge="Fila de espera"
			title={props.activityName}
			preview={activityWaitlistedSubject(props)}
			props={props}
			ctaLabel="Ver atividade"
		>
			<Text style={emailStyles.paragraph}>
				As vagas de <strong>{props.activityName}</strong> estão
				esgotadas no momento, então você entrou na fila de espera.
				{props.position
					? ` Sua posição atual é ${props.position}ª.`
					: ""}{" "}
				Se uma vaga abrir, avisaremos por este e-mail.
			</Text>
			<ActivityDetails
				dateText={props.activityDateText}
				location={props.activityLocation}
			/>
		</ActivityEmailShell>
	);
}

export async function renderActivityWaitlisted(
	props: unknown,
): Promise<RenderedTemplate> {
	const parsed = activityWaitlistedPayloadSchema.parse(props);
	const element = <ActivityWaitlistedEmail {...parsed} />;
	return renderBoth(
		element,
		activityWaitlistedSubject(parsed),
		ACTIVITY_WAITLISTED_VERSION,
	);
}

/** Sample props for `react-email dev` and registry previews. */
export const activityWaitlistedPreviewProps: ActivityWaitlistedProps = {
	participantName: "Maria Silva",
	eventName: "SECOMP 2026",
	activityName: "Oficina de React",
	activityDateText: "12 de abril de 2026, 14:00 – 18:00",
	activityLocation: "Laboratório 4",
	accessUrl: "https://example.com/secomp-2026/schedule/activity-1",
	position: 3,
};

/* ------------------------------------------------------------------ */
/* activity_waitlist_promoted                                          */
/* ------------------------------------------------------------------ */

export const ACTIVITY_WAITLIST_PROMOTED_VERSION = "v1" as const;

export type ActivityWaitlistPromotedProps = z.infer<typeof baseSchema>;

export const activityWaitlistPromotedSubject = (props: {
	activityName: string;
	eventName: string;
}) => `Vaga conquistada: ${props.activityName} – ${props.eventName}`;

export function ActivityWaitlistPromotedEmail(
	props: ActivityWaitlistPromotedProps,
) {
	return (
		<ActivityEmailShell
			badge="Vaga conquistada"
			title={props.activityName}
			preview={activityWaitlistPromotedSubject(props)}
			props={props}
			ctaLabel="Ver atividade"
		>
			<Text style={emailStyles.paragraph}>
				Uma vaga abriu em <strong>{props.activityName}</strong> e você
				saiu da fila de espera. Sua vaga já está confirmada — nos vemos
				lá!
			</Text>
			<ActivityDetails
				dateText={props.activityDateText}
				location={props.activityLocation}
			/>
		</ActivityEmailShell>
	);
}

export async function renderActivityWaitlistPromoted(
	props: unknown,
): Promise<RenderedTemplate> {
	const parsed = baseSchema.parse(props);
	const element = <ActivityWaitlistPromotedEmail {...parsed} />;
	return renderBoth(
		element,
		activityWaitlistPromotedSubject(parsed),
		ACTIVITY_WAITLIST_PROMOTED_VERSION,
	);
}

/** Sample props for `react-email dev` and registry previews. */
export const activityWaitlistPromotedPreviewProps: ActivityWaitlistPromotedProps =
	{
		participantName: "Maria Silva",
		eventName: "SECOMP 2026",
		activityName: "Oficina de React",
		activityDateText: "12 de abril de 2026, 14:00 – 18:00",
		activityLocation: "Laboratório 4",
		accessUrl: "https://example.com/secomp-2026/schedule/activity-1",
	};

/* ------------------------------------------------------------------ */
/* activity_enrollment_cancelled                                       */
/* ------------------------------------------------------------------ */

export const ACTIVITY_ENROLLMENT_CANCELLED_VERSION = "v1" as const;

export type ActivityEnrollmentCancelledProps = z.infer<typeof baseSchema>;

export const activityEnrollmentCancelledSubject = (props: {
	activityName: string;
	eventName: string;
}) => `Inscrição cancelada: ${props.activityName} – ${props.eventName}`;

export function ActivityEnrollmentCancelledEmail(
	props: ActivityEnrollmentCancelledProps,
) {
	return (
		<ActivityEmailShell
			badge="Inscrição cancelada"
			title={props.activityName}
			preview={activityEnrollmentCancelledSubject(props)}
			props={props}
			ctaLabel="Ver atividade"
		>
			<Text style={emailStyles.paragraph}>
				Sua inscrição em <strong>{props.activityName}</strong> foi
				cancelada. Se ainda houver vagas, você pode se inscrever
				novamente pela programação do evento.
			</Text>
			<ActivityDetails
				dateText={props.activityDateText}
				location={props.activityLocation}
			/>
		</ActivityEmailShell>
	);
}

export async function renderActivityEnrollmentCancelled(
	props: unknown,
): Promise<RenderedTemplate> {
	const parsed = baseSchema.parse(props);
	const element = <ActivityEnrollmentCancelledEmail {...parsed} />;
	return renderBoth(
		element,
		activityEnrollmentCancelledSubject(parsed),
		ACTIVITY_ENROLLMENT_CANCELLED_VERSION,
	);
}

/** Sample props for `react-email dev` and registry previews. */
export const activityEnrollmentCancelledPreviewProps: ActivityEnrollmentCancelledProps =
	{
		participantName: "Maria Silva",
		eventName: "SECOMP 2026",
		activityName: "Oficina de React",
		activityDateText: "12 de abril de 2026, 14:00 – 18:00",
		activityLocation: "Laboratório 4",
		accessUrl: "https://example.com/secomp-2026/schedule/activity-1",
	};

/* ------------------------------------------------------------------ */
/* activity_enrollment_removed                                         */
/* ------------------------------------------------------------------ */

export const ACTIVITY_ENROLLMENT_REMOVED_VERSION = "v1" as const;

export const activityEnrollmentRemovedPayloadSchema = baseSchema.extend({
	/** Optional reason written by the organizer. */
	reason: z.string().trim().min(1).optional(),
});
export type ActivityEnrollmentRemovedProps = z.infer<
	typeof activityEnrollmentRemovedPayloadSchema
>;

export const activityEnrollmentRemovedSubject = (props: {
	activityName: string;
	eventName: string;
}) => `Inscrição removida: ${props.activityName} – ${props.eventName}`;

export function ActivityEnrollmentRemovedEmail(
	props: ActivityEnrollmentRemovedProps,
) {
	return (
		<ActivityEmailShell
			badge="Inscrição removida"
			title={props.activityName}
			preview={activityEnrollmentRemovedSubject(props)}
			props={props}
			ctaLabel="Ver atividade"
		>
			<Text style={emailStyles.paragraph}>
				Sua inscrição em <strong>{props.activityName}</strong> foi
				removida pela organização do evento.
			</Text>
			{props.reason ? <EmailReason reason={props.reason} /> : null}
			<ActivityDetails
				dateText={props.activityDateText}
				location={props.activityLocation}
			/>
		</ActivityEmailShell>
	);
}

export async function renderActivityEnrollmentRemoved(
	props: unknown,
): Promise<RenderedTemplate> {
	const parsed = activityEnrollmentRemovedPayloadSchema.parse(props);
	const element = <ActivityEnrollmentRemovedEmail {...parsed} />;
	return renderBoth(
		element,
		activityEnrollmentRemovedSubject(parsed),
		ACTIVITY_ENROLLMENT_REMOVED_VERSION,
	);
}

/** Sample props for `react-email dev` and registry previews. */
export const activityEnrollmentRemovedPreviewProps: ActivityEnrollmentRemovedProps =
	{
		participantName: "Maria Silva",
		eventName: "SECOMP 2026",
		activityName: "Oficina de React",
		activityDateText: "12 de abril de 2026, 14:00 – 18:00",
		activityLocation: "Laboratório 4",
		accessUrl: "https://example.com/secomp-2026/schedule/activity-1",
		reason: "Conflito de horário com outra atividade.",
	};

/* ------------------------------------------------------------------ */
/* activity_updated                                                    */
/* ------------------------------------------------------------------ */

export const ACTIVITY_UPDATED_VERSION = "v1" as const;

export const activityUpdatedPayloadSchema = baseSchema.extend({
	/** Human list of what changed (e.g. "Data e local"). */
	changeSummary: z.string().trim().min(1).optional(),
});
export type ActivityUpdatedProps = z.infer<typeof activityUpdatedPayloadSchema>;

export const activityUpdatedSubject = (props: {
	activityName: string;
	eventName: string;
}) => `Atividade atualizada: ${props.activityName} – ${props.eventName}`;

export function ActivityUpdatedEmail(props: ActivityUpdatedProps) {
	return (
		<ActivityEmailShell
			badge="Atividade atualizada"
			title={props.activityName}
			preview={activityUpdatedSubject(props)}
			props={props}
			ctaLabel="Ver atividade"
		>
			<Text style={emailStyles.paragraph}>
				Os detalhes de <strong>{props.activityName}</strong> mudaram
				{props.changeSummary ? ` (${props.changeSummary})` : ""}. Veja
				como ficou:
			</Text>
			<ActivityDetails
				dateText={props.activityDateText}
				location={props.activityLocation}
			/>
		</ActivityEmailShell>
	);
}

export async function renderActivityUpdated(
	props: unknown,
): Promise<RenderedTemplate> {
	const parsed = activityUpdatedPayloadSchema.parse(props);
	const element = <ActivityUpdatedEmail {...parsed} />;
	return renderBoth(
		element,
		activityUpdatedSubject(parsed),
		ACTIVITY_UPDATED_VERSION,
	);
}

/** Sample props for `react-email dev` and registry previews. */
export const activityUpdatedPreviewProps: ActivityUpdatedProps = {
	participantName: "Maria Silva",
	eventName: "SECOMP 2026",
	activityName: "Oficina de React",
	activityDateText: "13 de abril de 2026, 09:00 – 12:00",
	activityLocation: "Laboratório 7",
	changeSummary: "Data e local",
	accessUrl: "https://example.com/secomp-2026/schedule/activity-1",
};

/* ------------------------------------------------------------------ */
/* activity_cancelled                                                  */
/* ------------------------------------------------------------------ */

export const ACTIVITY_CANCELLED_VERSION = "v1" as const;

export const activityCancelledPayloadSchema = baseSchema.extend({
	reason: z.string().trim().min(1).optional(),
});
export type ActivityCancelledProps = z.infer<
	typeof activityCancelledPayloadSchema
>;

export const activityCancelledSubject = (props: {
	activityName: string;
	eventName: string;
}) => `Atividade cancelada: ${props.activityName} – ${props.eventName}`;

export function ActivityCancelledEmail(props: ActivityCancelledProps) {
	return (
		<ActivityEmailShell
			badge="Atividade cancelada"
			title={props.activityName}
			preview={activityCancelledSubject(props)}
			props={props}
			ctaLabel="Ver programação"
		>
			<Text style={emailStyles.paragraph}>
				<strong>{props.activityName}</strong> foi cancelada pela
				organização do evento. Sentimos muito pelo transtorno.
			</Text>
			{props.reason ? <EmailReason reason={props.reason} /> : null}
			<ActivityDetails
				dateText={props.activityDateText}
				location={props.activityLocation}
				dateLabel="Era em"
			/>
		</ActivityEmailShell>
	);
}

export async function renderActivityCancelled(
	props: unknown,
): Promise<RenderedTemplate> {
	const parsed = activityCancelledPayloadSchema.parse(props);
	const element = <ActivityCancelledEmail {...parsed} />;
	return renderBoth(
		element,
		activityCancelledSubject(parsed),
		ACTIVITY_CANCELLED_VERSION,
	);
}

/** Sample props for `react-email dev` and registry previews. */
export const activityCancelledPreviewProps: ActivityCancelledProps = {
	participantName: "Maria Silva",
	eventName: "SECOMP 2026",
	activityName: "Oficina de React",
	activityDateText: "12 de abril de 2026, 14:00 – 18:00",
	activityLocation: "Laboratório 4",
	accessUrl: "https://example.com/secomp-2026/schedule",
	reason: "Palestrante indisponível.",
};

/* ------------------------------------------------------------------ */
/* event_registration_removed                                          */
/* ------------------------------------------------------------------ */

export const EVENT_REGISTRATION_REMOVED_VERSION = "v1" as const;

export const eventRegistrationRemovedPayloadSchema = z.object({
	participantName: z.string().trim().min(1),
	eventName: z.string().trim().min(1),
	accessUrl: z
		.url()
		.refine(
			(url) => url.startsWith("http://") || url.startsWith("https://"),
			"accessUrl must be an absolute http(s) URL",
		),
	reason: z.string().trim().min(1).optional(),
	logoUrl: z.string().optional(),
	logoAlt: z.string().trim().optional(),
});
export type EventRegistrationRemovedProps = z.infer<
	typeof eventRegistrationRemovedPayloadSchema
>;

export const eventRegistrationRemovedSubject = (props: { eventName: string }) =>
	`Sua inscrição em ${props.eventName} foi removida`;

export function EventRegistrationRemovedEmail(
	props: EventRegistrationRemovedProps,
) {
	return (
		<EmailLayout
			eventName={props.eventName}
			preview={eventRegistrationRemovedSubject(props)}
			logoUrl={props.logoUrl}
			logoAlt={props.logoAlt}
		>
			<Text style={emailStyles.badge}>Inscrição removida</Text>
			<Text style={emailStyles.title}>{props.eventName}</Text>
			<Text style={emailStyles.greeting}>
				Olá, {props.participantName}!
			</Text>
			<Text style={emailStyles.paragraph}>
				Sua inscrição em <strong>{props.eventName}</strong> foi removida
				pela organização do evento.
			</Text>
			{props.reason ? <EmailReason reason={props.reason} /> : null}
			<EmailCta href={props.accessUrl} label="Ver página do evento" />
		</EmailLayout>
	);
}

export async function renderEventRegistrationRemoved(
	props: unknown,
): Promise<RenderedTemplate> {
	const parsed = eventRegistrationRemovedPayloadSchema.parse(props);
	const element = <EventRegistrationRemovedEmail {...parsed} />;
	return renderBoth(
		element,
		eventRegistrationRemovedSubject(parsed),
		EVENT_REGISTRATION_REMOVED_VERSION,
	);
}

/** Sample props for `react-email dev` and registry previews. */
export const eventRegistrationRemovedPreviewProps: EventRegistrationRemovedProps =
	{
		participantName: "Maria Silva",
		eventName: "SECOMP 2026",
		accessUrl: "https://example.com/secomp-2026",
		reason: "Inscrição duplicada.",
	};

/* ------------------------------------------------------------------ */

async function renderBoth(
	element: React.ReactElement,
	subject: string,
	templateVersion: string,
): Promise<RenderedTemplate> {
	const [html, text] = await Promise.all([
		render(element),
		render(element, { plainText: true }),
	]);
	return { subject, html, text, templateVersion };
}
