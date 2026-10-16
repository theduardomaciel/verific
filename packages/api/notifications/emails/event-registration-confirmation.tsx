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

export const EVENT_REGISTRATION_CONFIRMATION_VERSION = "v3" as const;

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

/**
 * Only absolute https, non-SVG, non-WebP images are email-safe: most clients
 * refuse SVG and mixed content, and Gmail's proxy recompresses WebP while
 * flattening its alpha channel (Outlook desktop does not render it at all).
 * Anything else falls back to the event name as text.
 */
export function sanitizeLogoUrl(
	logoUrl: string | undefined,
): string | undefined {
	if (!logoUrl) return undefined;
	if (!logoUrl.startsWith("https://")) return undefined;
	if (/\.(svg|webp)([?#]|$)/i.test(logoUrl)) return undefined;
	return logoUrl;
}

export type EventRegistrationConfirmationProps =
	EventRegistrationConfirmationPayload;

const subjectFor = (eventName: string): string =>
	`Inscrição confirmada: ${eventName}`;

/**
 * Temporary hardcoded palette (SECOMP 26 identity) until organizers get an
 * editor. Mirrors the event theme: primary #5B21B6, secondary #22BFA3.
 */
const palette = {
	pageBg: "#0B0714",
	cardBg: "#150D26",
	headerBg: "#12081F",
	panelBg: "#1D1235",
	border: "#2E1B52",
	primary: "#5B21B6",
	primarySoft: "#A78BFA",
	teal: "#22BFA3",
	tealInk: "#04251E",
	text: "#F4F1FA",
	muted: "#B6AACB",
	subtle: "#7D7094",
} as const;

const MONO = "'Courier New', Courier, 'Lucida Console', monospace";
const SANS =
	"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

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
	const hasDetails = Boolean(eventDateText || eventLocation);
	return (
		<Html lang="pt-BR">
			<Head>
				<meta name="color-scheme" content="dark" />
				<meta name="supported-color-schemes" content="dark" />
			</Head>
			<Preview>{subject}</Preview>
			<Body style={styles.body}>
				<Container style={styles.container}>
					<Section style={styles.header}>
						{logoSrc ? (
							<Img
								src={logoSrc}
								alt={logoAlt || eventName}
								width="280"
								style={styles.logo}
							/>
						) : (
							<Text style={styles.brand}>{eventName}</Text>
						)}
					</Section>
					<Section style={styles.content}>
						<Text style={styles.badge}>
							// Inscrição confirmada
						</Text>
						<Text style={styles.title}>{eventName}</Text>
						<Text style={styles.greeting}>
							Olá, {participantName}!
						</Text>
						<Text style={styles.paragraph}>
							Sua inscrição em <strong>{eventName}</strong> foi
							confirmada. Use o botão abaixo para acessar sua
							inscrição quando precisar.
						</Text>
						{hasDetails ? (
							<Section style={styles.panel}>
								{eventDateText ? (
									<>
										<Text style={styles.metaLabel}>
											Data
										</Text>
										<Text style={styles.metaValue}>
											{eventDateText}
										</Text>
									</>
								) : null}
								{eventLocation ? (
									<>
										<Text
											style={{
												...styles.metaLabel,
												...(eventDateText
													? styles.metaLabelSpaced
													: null),
											}}
										>
											Local
										</Text>
										<Text style={styles.metaValue}>
											{eventLocation}
										</Text>
									</>
								) : null}
							</Section>
						) : null}
						<Section style={styles.cta}>
							<Button href={accessUrl} style={styles.button}>
								Acessar minha inscrição
							</Button>
						</Section>
						<Text style={styles.fallback}>
							Se o botão não funcionar, acesse este link:
							<br />
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
						<Text style={styles.footerBrand}>verifIC</Text>
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

const styles = {
	body: {
		backgroundColor: palette.pageBg,
		fontFamily: SANS,
		margin: "0",
		padding: "24px 0",
	},
	container: {
		backgroundColor: palette.cardBg,
		margin: "0 auto",
		maxWidth: "600px",
		border: `1px solid ${palette.border}`,
		borderRadius: "12px",
		overflow: "hidden",
	},
	header: {
		backgroundColor: palette.headerBg,
		borderBottom: `4px solid ${palette.teal}`,
		textAlign: "center" as const,
	},
	logo: {
		display: "block",
		margin: "0 auto",
		padding: "28px 0",
		maxWidth: "100%",
		height: "auto",
	},
	brand: {
		fontFamily: MONO,
		fontSize: "22px",
		fontWeight: "700",
		letterSpacing: "3px",
		textTransform: "uppercase" as const,
		color: palette.text,
		padding: "28px 32px",
		margin: "0",
	},
	content: {
		padding: "32px 32px 8px",
	},
	badge: {
		fontFamily: MONO,
		fontSize: "12px",
		fontWeight: "700",
		letterSpacing: "2px",
		textTransform: "uppercase" as const,
		color: palette.teal,
		margin: "0 0 12px",
	},
	title: {
		fontFamily: MONO,
		fontSize: "30px",
		lineHeight: "36px",
		fontWeight: "700",
		letterSpacing: "2px",
		textTransform: "uppercase" as const,
		color: palette.text,
		margin: "0 0 24px",
	},
	greeting: {
		fontSize: "18px",
		fontWeight: "700",
		color: palette.text,
		margin: "0 0 8px",
	},
	paragraph: {
		fontSize: "15px",
		lineHeight: "24px",
		color: palette.muted,
		margin: "0 0 20px",
	},
	panel: {
		backgroundColor: palette.panelBg,
		borderLeft: `4px solid ${palette.primary}`,
		border: `1px solid ${palette.border}`,
		borderLeftWidth: "4px",
		borderLeftColor: palette.teal,
		borderRadius: "8px",
		padding: "16px 20px",
		margin: "0 0 8px",
	},
	metaLabel: {
		fontFamily: MONO,
		fontSize: "11px",
		fontWeight: "700",
		letterSpacing: "2px",
		textTransform: "uppercase" as const,
		color: palette.primarySoft,
		margin: "0 0 4px",
	},
	metaLabelSpaced: {
		marginTop: "16px",
	},
	metaValue: {
		fontSize: "15px",
		lineHeight: "22px",
		fontWeight: "600",
		color: palette.text,
		margin: "0",
	},
	cta: {
		textAlign: "center" as const,
		padding: "24px 0 8px",
	},
	button: {
		backgroundColor: palette.teal,
		color: palette.tealInk,
		fontFamily: MONO,
		fontSize: "14px",
		fontWeight: "700",
		letterSpacing: "1.5px",
		textTransform: "uppercase" as const,
		padding: "14px 28px",
		borderRadius: "6px",
		textDecoration: "none",
	},
	fallback: {
		fontSize: "13px",
		lineHeight: "20px",
		color: palette.subtle,
		wordBreak: "break-all" as const,
		textAlign: "center" as const,
		margin: "16px 0 8px",
	},
	link: {
		color: palette.primarySoft,
		textDecoration: "underline",
	},
	footer: {
		padding: "16px 32px 24px",
		borderTop: `1px solid ${palette.border}`,
	},
	footerText: {
		fontSize: "12px",
		lineHeight: "18px",
		color: palette.subtle,
		margin: "4px 0",
	},
	footerBrand: {
		fontFamily: MONO,
		fontSize: "12px",
		fontWeight: "700",
		letterSpacing: "2px",
		color: palette.subtle,
		margin: "4px 0",
	},
} as const;
