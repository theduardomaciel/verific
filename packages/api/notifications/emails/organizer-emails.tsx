import { render, Section, Text } from "react-email";

import { z } from "@verific/zod";

import {
	VerificEmailCta,
	VerificTransactionalLayout,
	verificEmailStyles,
} from "./verific-transactional-layout";

import type { RenderedTemplate } from "../templates";

export const EMAIL_QUOTA_WARNING_VERSION = "v1" as const;

export const emailQuotaWarningPayloadSchema = z.object({
	organizerName: z.string().trim().min(1),
	eventName: z.string().trim().min(1),
	/** Sends already used in the rolling 24h window. */
	used: z.number().int().nonnegative(),
	/** Configured EMAIL_DAILY_LIMIT. */
	limit: z.number().int().positive(),
	/** Day the warning refers to (default time zone): YYYY-MM-DD. */
	day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	accessUrl: z
		.url()
		.refine(
			(url) => url.startsWith("http://") || url.startsWith("https://"),
			"accessUrl must be an absolute http(s) URL",
		),
	logoUrl: z.string().optional(),
	logoAlt: z.string().trim().optional(),
});

export type EmailQuotaWarningProps = z.infer<
	typeof emailQuotaWarningPayloadSchema
>;

export const emailQuotaWarningSubject = (props: { eventName: string }) =>
	`Atenção: 80% da cota diária de e-mails de ${props.eventName}`;

export function EmailQuotaWarningEmail(props: EmailQuotaWarningProps) {
	const percent = Math.min(100, Math.round((props.used / props.limit) * 100));
	return (
		<VerificTransactionalLayout
			brandName="verifIC"
			preview={emailQuotaWarningSubject(props)}
			logoUrl={props.logoUrl}
			logoAlt={props.logoAlt}
			footerText="Alerta automático da plataforma verifIC."
		>
			<Text style={verificEmailStyles.badge}>Cota de e-mails</Text>
			<Text style={verificEmailStyles.title}>Uso diário de e-mails</Text>
			<Text style={verificEmailStyles.greeting}>
				Olá, {props.organizerName}!
			</Text>
			<Text style={verificEmailStyles.paragraph}>
				O evento <strong>{props.eventName}</strong> atingiu {percent}%
				do limite diário de envio de e-mails. Novos envios podem ser
				bloqueados até o limite liberar.
			</Text>
			<Section style={verificEmailStyles.panel}>
				<Text style={verificEmailStyles.metaLabel}>
					Enviados nas últimas 24h
				</Text>
				<Text style={verificEmailStyles.metaValue}>
					{props.used} de {props.limit}
				</Text>
				<Text
					style={{
						...verificEmailStyles.metaLabel,
						...verificEmailStyles.metaLabelSpaced,
					}}
				>
					Enviar aviso novamente
				</Text>
				<Text style={verificEmailStyles.metaValue}>
					No máximo uma vez por dia ({props.day}).
				</Text>
			</Section>
			<VerificEmailCta
				href={props.accessUrl}
				label="Ver painel de e-mails"
			/>
		</VerificTransactionalLayout>
	);
}

export async function renderEmailQuotaWarning(
	props: unknown,
): Promise<RenderedTemplate> {
	const parsed = emailQuotaWarningPayloadSchema.parse(props);
	const element = <EmailQuotaWarningEmail {...parsed} />;
	const [html, text] = await Promise.all([
		render(element),
		render(element, { plainText: true }),
	]);
	return {
		subject: emailQuotaWarningSubject(parsed),
		html,
		text,
		templateVersion: EMAIL_QUOTA_WARNING_VERSION,
	};
}

/** Sample props for `react-email dev` and registry previews. */
export const emailQuotaWarningPreviewProps: EmailQuotaWarningProps = {
	organizerName: "João Organizador",
	eventName: "SECOMP 2026",
	used: 80,
	limit: 100,
	day: "2026-04-12",
	accessUrl: "https://example.com/dashboard/emails",
};
