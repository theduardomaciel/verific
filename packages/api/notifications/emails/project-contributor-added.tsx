import { render, Section, Text } from "react-email";

import { z } from "@verific/zod";

import {
	VerificEmailCta,
	VerificTransactionalLayout,
	verificEmailStyles,
} from "./verific-transactional-layout";

import type { RenderedTemplate } from "../templates";

export const PROJECT_CONTRIBUTOR_ADDED_VERSION = "v1" as const;

export const projectContributorAddedPayloadSchema = z.object({
	recipientName: z.string().trim().min(1),
	projectName: z.string().trim().min(1),
	/** Name of the person who granted access (owner). */
	addedByName: z.string().trim().min(1).optional(),
	accessUrl: z
		.url()
		.refine(
			(url) => url.startsWith("http://") || url.startsWith("https://"),
			"accessUrl must be an absolute http(s) URL",
		),
	logoUrl: z.string().optional(),
	logoAlt: z.string().trim().optional(),
});

export type ProjectContributorAddedProps = z.infer<
	typeof projectContributorAddedPayloadSchema
>;

export const projectContributorAddedSubject = (props: {
	projectName: string;
}) => `Você foi adicionado como contribuidor de ${props.projectName}`;

export function ProjectContributorAddedEmail(
	props: ProjectContributorAddedProps,
) {
	const greetingName = props.recipientName;
	return (
		<VerificTransactionalLayout
			brandName="verifIC"
			preview={projectContributorAddedSubject(props)}
			logoUrl={props.logoUrl}
			logoAlt={props.logoAlt}
			footerText="Você recebeu este e-mail porque foi adicionado como contribuidor de um projeto na verifIC."
		>
			<Text style={verificEmailStyles.badge}>Projeto compartilhado</Text>
			<Text style={verificEmailStyles.title}>Novo acesso</Text>
			<Text style={verificEmailStyles.greeting}>
				Olá, {greetingName}!
			</Text>
			<Text style={verificEmailStyles.paragraph}>
				{props.addedByName
					? `${props.addedByName} adicionou você como contribuidor do projeto `
					: "Você foi adicionado como contribuidor do projeto "}
				<strong>{props.projectName}</strong>. A partir de agora você
				pode acessar o painel do projeto e colaborar na organização.
			</Text>
			<Section style={verificEmailStyles.panel}>
				<Text style={verificEmailStyles.metaLabel}>Projeto</Text>
				<Text style={verificEmailStyles.metaValue}>
					{props.projectName}
				</Text>
			</Section>
			<VerificEmailCta href={props.accessUrl} label="Acessar projeto" />
		</VerificTransactionalLayout>
	);
}

export async function renderProjectContributorAdded(
	props: unknown,
): Promise<RenderedTemplate> {
	const parsed = projectContributorAddedPayloadSchema.parse(props);
	const element = <ProjectContributorAddedEmail {...parsed} />;
	const [html, text] = await Promise.all([
		render(element),
		render(element, { plainText: true }),
	]);
	return {
		subject: projectContributorAddedSubject(parsed),
		html,
		text,
		templateVersion: PROJECT_CONTRIBUTOR_ADDED_VERSION,
	};
}

/** Sample props for `react-email dev` and registry previews. */
export const projectContributorAddedPreviewProps: ProjectContributorAddedProps =
	{
		recipientName: "Maria Silva",
		projectName: "SECOMP 2026",
		addedByName: "João Organizador",
		accessUrl: "https://example.com/dashboard",
		logoUrl: "https://example.com/verific-logo-blue.png",
	};
