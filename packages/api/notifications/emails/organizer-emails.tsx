import { render, Section, Text } from "react-email";

import { z } from "@verific/zod";

import { EmailCta, EmailLayout, emailStyles } from "./layout";

import type { RenderedTemplate } from "../templates";

export const EMAIL_QUOTA_WARNING_VERSION = "v1" as const;

export const emailQuotaWarningPayloadSchema = z.object({
	organizerName: z.string().trim().min(1),
	eventName: z.string().trim().min(1),
	/** Sends already used in the rolling 24h window. */
	used: z.number().int().nonnegative(),
	/** Configured EMAIL_DAILY_LIMIT. */
	limit: z.number().int().positive(),
	/** ISO day (America/Sao_Paulo) the warning refers to: YYYY-MM-DD. */
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
		<EmailLayout
			eventName={props.eventName}
			preview={emailQuotaWarningSubject(props)}
			logoUrl={props.logoUrl}
			logoAlt={props.logoAlt}
			footerText="Alerta automático para a organização do evento."
		>
			<Text style={emailStyles.badge}>Cota de e-mails</Text>
			<Text style={emailStyles.title}>Uso diário de e-mails</Text>
			<Text style={emailStyles.greeting}>
				Olá, {props.organizerName}!
			</Text>
			<Text style={emailStyles.paragraph}>
				O evento <strong>{props.eventName}</strong> atingiu {percent}%
				do limite diário de envio de e-mails. Novos envios podem ser
				bloqueados até o limite liberar.
			</Text>
			<Section style={emailStyles.panel}>
				<Text style={emailStyles.metaLabel}>
					Enviados nas últimas 24h
				</Text>
				<Text style={emailStyles.metaValue}>
					{props.used} de {props.limit}
				</Text>
				<Text
					style={{
						...emailStyles.metaLabel,
						...emailStyles.metaLabelSpaced,
					}}
				>
					Enviar aviso novamente
				</Text>
				<Text style={emailStyles.metaValue}>
					No máximo uma vez por dia ({props.day}).
				</Text>
			</Section>
			<EmailCta href={props.accessUrl} label="Ver painel de e-mails" />
		</EmailLayout>
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
