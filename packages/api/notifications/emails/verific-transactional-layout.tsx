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
 * Shared "verifIC" platform layout for transactional e-mails that are NOT
 * tied to an event's identity (project sharing, project deletion, e-mail quota
 * warnings, account-level notices). Uses the verifIC brand: blue tones + the
 * verifIC logo, with a text fallback to "verifIC".
 *
 * Event-scoped e-mails keep using `./layout` (SECOMP palette + event logo).
 */
export interface VerificTransactionalLayoutProps {
	/** Used as the header text fallback and the logo alt default. */
	brandName?: string;
	preview: string;
	children: React.ReactNode;
	logoUrl?: string;
	logoAlt?: string;
	footerText?: string;
}

export function sanitizeVerificLogoUrl(
	logoUrl: string | undefined,
): string | undefined {
	if (!logoUrl) return undefined;
	if (!logoUrl.startsWith("https://")) return undefined;
	if (/\.(svg|webp)([?#]|$)/i.test(logoUrl)) return undefined;
	return logoUrl;
}

export const verificPalette = {
	pageBg: "#0B1020",
	cardBg: "#111827",
	headerBg: "#0F172A",
	panelBg: "#1E293B",
	border: "#1E3A8A",
	primary: "#3B82F6",
	primarySoft: "#93C5FD",
	accent: "#60A5FA",
	text: "#F8FAFC",
	muted: "#CBD5E1",
	subtle: "#94A3B8",
	buttonText: "#FFFFFF",
} as const;

const MONO = "'Courier New', Courier, 'Lucida Console', monospace";
const SANS =
	"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function VerificTransactionalLayout({
	brandName = "verifIC",
	preview,
	children,
	logoUrl,
	logoAlt,
	footerText,
}: VerificTransactionalLayoutProps) {
	const logoSrc = sanitizeVerificLogoUrl(logoUrl);
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
								alt={logoAlt || brandName}
								width="200"
								style={baseStyles.logo}
							/>
						) : (
							<Text style={baseStyles.brand}>{brandName}</Text>
						)}
					</Section>
					<Section style={baseStyles.content}>{children}</Section>
					<Section style={baseStyles.footer}>
						<Text style={baseStyles.footerText}>
							{footerText ??
								"Você recebeu este e-mail porque tem uma conta na verifIC."}
						</Text>
						<Text style={baseStyles.footerBrand}>verifIC</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

export const verificEmailStyles = {
	badge: {
		fontFamily: MONO,
		fontSize: "12px",
		fontWeight: "700",
		letterSpacing: "2px",
		textTransform: "uppercase" as const,
		color: verificPalette.accent,
		margin: "0 0 12px",
	},
	title: {
		fontFamily: MONO,
		fontSize: "28px",
		lineHeight: "34px",
		fontWeight: "700",
		letterSpacing: "2px",
		textTransform: "uppercase" as const,
		color: verificPalette.text,
		margin: "0 0 24px",
	},
	greeting: {
		fontSize: "18px",
		fontWeight: "700",
		color: verificPalette.text,
		margin: "0 0 8px",
	},
	paragraph: {
		fontSize: "15px",
		lineHeight: "24px",
		color: verificPalette.muted,
		margin: "0 0 20px",
	},
	panel: {
		backgroundColor: verificPalette.panelBg,
		border: `1px solid ${verificPalette.border}`,
		borderLeftWidth: "4px",
		borderLeftColor: verificPalette.primary,
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
		color: verificPalette.primarySoft,
		margin: "0 0 4px",
	},
	metaLabelSpaced: {
		marginTop: "16px",
	},
	metaValue: {
		fontSize: "15px",
		lineHeight: "22px",
		fontWeight: "600",
		color: verificPalette.text,
		margin: "0",
	},
	cta: {
		textAlign: "center" as const,
		padding: "24px 0 8px",
	},
	button: {
		backgroundColor: verificPalette.primary,
		color: verificPalette.buttonText,
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
		color: verificPalette.subtle,
		wordBreak: "break-all" as const,
		textAlign: "center" as const,
		margin: "16px 0 8px",
	},
	link: {
		color: verificPalette.primarySoft,
		textDecoration: "underline",
	},
} as const;

export const verificEmailFonts = { SANS, MONO } as const;

const baseStyles = {
	body: {
		backgroundColor: verificPalette.pageBg,
		fontFamily: SANS,
		margin: "0",
		padding: "24px 0",
	},
	container: {
		backgroundColor: verificPalette.cardBg,
		margin: "0 auto",
		maxWidth: "600px",
		border: `1px solid ${verificPalette.border}`,
		borderRadius: "12px",
		overflow: "hidden",
	},
	header: {
		backgroundColor: verificPalette.headerBg,
		borderBottom: `4px solid ${verificPalette.primary}`,
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
		color: verificPalette.text,
		padding: "28px 32px",
		margin: "0",
	},
	content: {
		padding: "32px 32px 8px",
	},
	footer: {
		padding: "16px 32px 24px",
		borderTop: `1px solid ${verificPalette.border}`,
	},
	footerText: {
		fontSize: "12px",
		lineHeight: "18px",
		color: verificPalette.subtle,
		margin: "4px 0",
	},
	footerBrand: {
		fontFamily: MONO,
		fontSize: "12px",
		fontWeight: "700",
		letterSpacing: "2px",
		color: verificPalette.subtle,
		margin: "4px 0",
	},
} as const;

export function VerificEmailCta({
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
			<Section style={verificEmailStyles.cta}>
				<Button href={href} style={verificEmailStyles.button}>
					{label}
				</Button>
			</Section>
			<Text style={verificEmailStyles.fallback}>
				{fallbackLabel}
				<br />
				<Link href={href} style={verificEmailStyles.link}>
					{href}
				</Link>
			</Text>
		</>
	);
}
