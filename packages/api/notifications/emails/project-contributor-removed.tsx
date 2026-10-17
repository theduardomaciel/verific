import { render, Section, Text } from "react-email";

import { z } from "@verific/zod";

import {
	VerificEmailCta,
	VerificTransactionalLayout,
	verificEmailStyles,
} from "./verific-transactional-layout";

import type { RenderedTemplate } from "../templates";

export const PROJECT_CONTRIBUTOR_REMOVED_VERSION = "v1" as const;

export const projectContributorRemovedPayloadSchema = z.object({
	recipientName: z.string().trim().min(1),
	projectName: z.string().trim().min(1),
	removedByName: z.string().trim().min(1).optional(),
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

export type ProjectContributorRemovedProps = z.infer<
	typeof projectContributorRemovedPayloadSchema
>;

export const projectContributorRemovedSubject = (props: {
	projectName: string;
}) => `Seu acesso ao projeto ${props.projectName} foi removido`;

export function ProjectContributorRemovedEmail(
	props: ProjectContributorRemovedProps,
) {
	return (
		<VerificTransactionalLayout
			brandName="verifIC"
			preview={projectContributorRemovedSubject(props)}
			logoUrl={props.logoUrl}
			logoAlt={props.logoAlt}
			footerText="Você recebeu este e-mail porque era contribuidor de um projeto na verifIC."
		>
			<Text style={verificEmailStyles.badge}>Projeto</Text>
			<Text style={verificEmailStyles.title}>Acesso removido</Text>
			<Text style={verificEmailStyles.greeting}>
				Olá, {props.recipientName}!
			</Text>
			<Text style={verificEmailStyles.paragraph}>
				{props.removedByName
					? `${props.removedByName} removeu seu acesso como contribuidor do projeto `
					: "Seu acesso como contribuidor do projeto "}
				<strong>{props.projectName}</strong>.
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

export async function renderProjectContributorRemoved(
	props: unknown,
): Promise<RenderedTemplate> {
	const parsed = projectContributorRemovedPayloadSchema.parse(props);
	const element = <ProjectContributorRemovedEmail {...parsed} />;
	const [html, text] = await Promise.all([
		render(element),
		render(element, { plainText: true }),
	]);
	return {
		subject: projectContributorRemovedSubject(parsed),
		html,
		text,
		templateVersion: PROJECT_CONTRIBUTOR_REMOVED_VERSION,
	};
}

export const projectContributorRemovedPreviewProps: ProjectContributorRemovedProps =
	{
		recipientName: "Maria Silva",
		projectName: "SECOMP 2026",
		removedByName: "João Organizador",
		reason: "Encerramento da colaboração.",
		accessUrl: "https://example.com/account",
		logoUrl: "https://example.com/verific-logo-blue.png",
	};
