import { render, Section, Text } from "react-email";

import { z } from "@verific/zod";

import {
	VerificEmailCta,
	VerificTransactionalLayout,
	verificEmailStyles,
} from "./verific-transactional-layout";

import type { RenderedTemplate } from "../templates";

export const PROJECT_DELETED_VERSION = "v1" as const;

export const projectDeletedPayloadSchema = z.object({
	recipientName: z.string().trim().min(1),
	projectName: z.string().trim().min(1),
	deletedByName: z.string().trim().min(1).optional(),
	reason: z.string().trim().min(1).optional(),
	accessUrl: z
		.url()
		.refine(
			(url) => url.startsWith("http://") || url.startsWith("https://"),
			"accessUrl must be an absolute http(s) URL",
		),
	logoUrl: z.string().optional(),
	logoAlt: z.string().trim().optional(),
});

export type ProjectDeletedProps = z.infer<typeof projectDeletedPayloadSchema>;

export const projectDeletedSubject = (props: { projectName: string }) =>
	`Projeto excluído: ${props.projectName}`;

export function ProjectDeletedEmail(props: ProjectDeletedProps) {
	return (
		<VerificTransactionalLayout
			brandName="verifIC"
			preview={projectDeletedSubject(props)}
			logoUrl={props.logoUrl}
			logoAlt={props.logoAlt}
			footerText="Você recebeu este e-mail porque era contribuidor de um projeto na verifIC."
		>
			<Text style={verificEmailStyles.badge}>Projeto excluído</Text>
			<Text style={verificEmailStyles.title}>Acesso encerrado</Text>
			<Text style={verificEmailStyles.greeting}>
				Olá, {props.recipientName}!
			</Text>
			<Text style={verificEmailStyles.paragraph}>
				{props.deletedByName
					? `${props.deletedByName} excluiu o projeto `
					: "O projeto "}
				<strong>{props.projectName}</strong>. O acesso ao painel foi
				encerrado e os dados não estão mais disponíveis.
			</Text>
			{props.reason ? (
				<Section style={verificEmailStyles.panel}>
					<Text style={verificEmailStyles.metaLabel}>
						Motivo informado
					</Text>
					<Text style={verificEmailStyles.metaValue}>
						{props.reason}
					</Text>
				</Section>
			) : null}
			<VerificEmailCta href={props.accessUrl} label="Ver meus projetos" />
		</VerificTransactionalLayout>
	);
}

export async function renderProjectDeleted(
	props: unknown,
): Promise<RenderedTemplate> {
	const parsed = projectDeletedPayloadSchema.parse(props);
	const element = <ProjectDeletedEmail {...parsed} />;
	const [html, text] = await Promise.all([
		render(element),
		render(element, { plainText: true }),
	]);
	return {
		subject: projectDeletedSubject(parsed),
		html,
		text,
		templateVersion: PROJECT_DELETED_VERSION,
	};
}

/** Sample props for `react-email dev` and registry previews. */
export const projectDeletedPreviewProps: ProjectDeletedProps = {
	recipientName: "Maria Silva",
	projectName: "SECOMP 2026",
	deletedByName: "João Organizador",
	reason: "Evento cancelado.",
	accessUrl: "https://example.com/account",
	logoUrl: "https://example.com/verific-logo-blue.png",
};
