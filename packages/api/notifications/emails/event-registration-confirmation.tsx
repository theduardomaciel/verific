import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Img,
	Link,
	Preview,
	Section,
	Text,
	render,
} from "react-email";

import { z } from "@verific/zod";

import type { RenderedTemplate } from "../templates";

export const EVENT_REGISTRATION_CONFIRMATION_VERSION = "v2" as const;

export const eventRegistrationConfirmationPayloadSchema = z.object({
	participantName: z.string().trim().min(1),
	eventName: z.string().trim().min(1),
	eventDateText: z.string().trim().optional(),
	eventLocation: z.string().trim().optional(),
	accessUrl: z
		.string()
		.url()
		.refine(
			(url) => url.startsWith("http://") || url.startsWith("https://"),
			"accessUrl must be an absolute http(s) URL",
		),
	// Loose on purpose: an unusable logo must never block the email. The
	// render step sanitizes it and falls back to the event name as text.
	logoUrl: z.string().optional(),
	// Alt text override for when the image is not the event logo (e.g. the
	// verifIC brand mark). Defaults to the event name.
	logoAlt: z.string().trim().optional(),
});

export type EventRegistrationConfirmationPayload = z.infer<
	typeof eventRegistrationConfirmationPayloadSchema
>;

/**
 * Only absolute https, non-SVG images are email-safe (most clients refuse
 * SVG and mixed content). Anything else falls back to the event name.
 */
export function sanitizeLogoUrl(
	logoUrl: string | undefined,
): string | undefined {
	if (!logoUrl) return undefined;
	if (!logoUrl.startsWith("https://")) return undefined;
	if (/\.svg([?#]|$)/i.test(logoUrl)) return undefined;
	return logoUrl;
}

export type EventRegistrationConfirmationProps =
	EventRegistrationConfirmationPayload;

const subjectFor = (eventName: string): string =>
	`Inscrição confirmada: ${eventName}`;

export function EventRegistrationConfirmationEmail({
	participantName,
	eventName,
	eventDateText,
	eventLocation,
	accessUrl,
	logoUrl,
	logoAlt,
}: EventRegistrationConfirmationProps) {
	const subject = subjectFor(eventName);
	const logoSrc = sanitizeLogoUrl(logoUrl);
	return (
		<Html lang="pt-BR">
			<Head />
			<Preview>{subject}</Preview>
			<Body style={styles.body}>
				<Container style={styles.container}>
					<Section style={styles.header}>
						{logoSrc ? (
							<Img
								src={logoSrc}
								alt={logoAlt || eventName}
								width="160"
								style={styles.logo}
							/>
						) : (
							<Text style={styles.brand}>{eventName}</Text>
						)}
					</Section>
					<Section style={styles.content}>
						<Text style={styles.greeting}>
							Olá, {participantName}!
						</Text>
						<Text style={styles.paragraph}>
							Sua inscrição em <strong>{eventName}</strong> foi
							confirmada.
						</Text>
						{eventDateText ? (
							<Text style={styles.meta}>
								Data: {eventDateText}
							</Text>
						) : null}
						{eventLocation ? (
							<Text style={styles.meta}>
								Local: {eventLocation}
							</Text>
						) : null}
						<Section style={styles.cta}>
							<Button href={accessUrl} style={styles.button}>
								Acessar minha inscrição
							</Button>
						</Section>
						<Text style={styles.fallback}>
							Se o botão não funcionar, acesse este link:{" "}
							<Link href={accessUrl} style={styles.link}>
								{accessUrl}
							</Link>
						</Text>
					</Section>
					<Section style={styles.footer}>
						<Text style={styles.footerText}>
							Se você não fez esta inscrição, pode ignorar esta
							mensagem.
						</Text>
						<Text style={styles.footerText}>verifIC</Text>
					</Section>
				</Container>
			</Body>
		</Html>
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
		subject: subjectFor(parsed.eventName),
		html,
		text,
		templateVersion: EVENT_REGISTRATION_CONFIRMATION_VERSION,
	};
}

export const eventRegistrationConfirmationPreviewProps: EventRegistrationConfirmationProps =
	{
		participantName: "Maria Silva",
		eventName: "Secomp UFAL 2026",
		eventDateText: "12 de abril de 2026, 14:00 – 18:00",
		eventLocation: "Campus A. C. Simões, Maceió – AL",
		accessUrl: "https://example.com/secomp-2026/profile/abc123?me=1",
		logoUrl: "https://example.com/logo_blue.png",
		logoAlt: "verifIC",
	};

export default function EventRegistrationConfirmationPreview() {
	return (
		<EventRegistrationConfirmationEmail
			{...eventRegistrationConfirmationPreviewProps}
		/>
	);
}

const styles = {
	body: {
		backgroundColor: "#f4f4f5",
		fontFamily:
			"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
		margin: "0",
		padding: "24px 0",
	},
	container: {
		backgroundColor: "#ffffff",
		margin: "0 auto",
		maxWidth: "600px",
		borderRadius: "8px",
		overflow: "hidden",
	},
	header: {
		padding: "24px 32px",
		textAlign: "center" as const,
		borderBottom: "1px solid #e4e4e7",
	},
	logo: {
		margin: "0 auto",
	},
	brand: {
		fontSize: "20px",
		fontWeight: "700",
		color: "#18181b",
		margin: "0",
	},
	content: {
		padding: "8px 32px 24px",
	},
	greeting: {
		fontSize: "18px",
		fontWeight: "700",
		color: "#18181b",
	},
	paragraph: {
		fontSize: "15px",
		lineHeight: "24px",
		color: "#27272a",
	},
	meta: {
		fontSize: "14px",
		lineHeight: "22px",
		color: "#52525b",
		margin: "4px 0",
	},
	cta: {
		textAlign: "center" as const,
		padding: "16px 0 8px",
	},
	button: {
		backgroundColor: "#27272a",
		color: "#ffffff",
		fontSize: "15px",
		fontWeight: "700",
		padding: "12px 24px",
		borderRadius: "6px",
		textDecoration: "none",
	},
	fallback: {
		fontSize: "13px",
		lineHeight: "20px",
		color: "#71717a",
		wordBreak: "break-all" as const,
	},
	link: {
		color: "#27272a",
		textDecoration: "underline",
	},
	footer: {
		padding: "16px 32px 24px",
		borderTop: "1px solid #e4e4e7",
	},
	footerText: {
		fontSize: "12px",
		lineHeight: "18px",
		color: "#a1a1aa",
		margin: "4px 0",
	},
} as const;
