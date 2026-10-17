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
} from "react-email";

/**
 * Shared dark SECOMP 26 layout for every notification e-mail. Templates only
 * declare their content block; header (logo with text fallback), preview,
 * CTA and footer stay identical across types. Customization is intentionally
 * restricted to the event logo for now (no organizer editor).
 */
export interface EmailLayoutProps {
	/** Used as the header text fallback and the logo alt default. */
	eventName: string;
	preview: string;
	children: React.ReactNode;
	logoUrl?: string;
	logoAlt?: string;
	footerText?: string;
}

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

/**
 * Temporary hardcoded palette (SECOMP 26 identity) until organizers get an
 * editor. Mirrors the event theme: primary #5B21B6, secondary #22BFA3.
 */
export const palette = {
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

export function EmailLayout({
	eventName,
	preview,
	children,
	logoUrl,
	logoAlt,
	footerText,
}: EmailLayoutProps) {
	const logoSrc = sanitizeLogoUrl(logoUrl);
	return (
		<Html lang="pt-BR">
			<Head>
				<meta name="color-scheme" content="dark" />
				<meta name="supported-color-schemes" content="dark" />
			</Head>
			<Preview>{preview}</Preview>
			<Body style={baseStyles.body}>
				<Container style={baseStyles.container}>
					<Section style={baseStyles.header}>
						{logoSrc ? (
							<Img
								src={logoSrc}
								alt={logoAlt || eventName}
								width="280"
								style={baseStyles.logo}
							/>
						) : (
							<Text style={baseStyles.brand}>{eventName}</Text>
						)}
					</Section>
					<Section style={baseStyles.content}>{children}</Section>
					<Section style={baseStyles.footer}>
						<Text style={baseStyles.footerText}>
							{footerText ??
								"Você recebeu este e-mail porque se cadastrou neste evento."}
						</Text>
						<Text style={baseStyles.footerBrand}>verifIC</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

/** Content block styles shared by every template. */
export const emailStyles = {
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
} as const;

export const emailFonts = { SANS, MONO } as const;

const baseStyles = {
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

/** CTA button + fallback link block shared by every template. */
export function EmailCta({
	href,
	label,
	fallbackLabel = "Se o botão não funcionar, acesse este link:",
}: {
	href: string;
	label: string;
	fallbackLabel?: string;
}) {
	return (
		<>
			<Section style={emailStyles.cta}>
				<Button href={href} style={emailStyles.button}>
					{label}
				</Button>
			</Section>
			<Text style={emailStyles.fallback}>
				{fallbackLabel}
				<br />
				<Link href={href} style={emailStyles.link}>
					{href}
				</Link>
			</Text>
		</>
	);
}

/** Optional "Reason" callout used by removal/cancellation e-mails. */
export function EmailReason({ reason }: { reason: string }) {
	return (
		<Section style={emailStyles.panel}>
			<Text style={emailStyles.metaLabel}>Motivo informado</Text>
			<Text style={emailStyles.metaValue}>{reason}</Text>
		</Section>
	);
}
