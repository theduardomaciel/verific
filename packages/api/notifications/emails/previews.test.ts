import type { ComponentType } from "react";
import { createElement } from "react";

import { render } from "react-email";
import { describe, expect, it } from "vitest";

import ActivityCancelledPreview from "./previews/activity-cancelled";
import ActivityEnrollmentCancelledPreview from "./previews/activity-enrollment-cancelled";
import ActivityEnrollmentConfirmedPreview from "./previews/activity-enrollment-confirmed";
import ActivityEnrollmentRemovedPreview from "./previews/activity-enrollment-removed";
import ActivityUpdatedPreview from "./previews/activity-updated";
import ActivityWaitlistOfferRevokedPreview from "./previews/activity-waitlist-offer-revoked";
import ActivityWaitlistOfferedPreview from "./previews/activity-waitlist-offered";
import ActivityWaitlistPromotedPreview from "./previews/activity-waitlist-promoted";
import ActivityWaitlistedPreview from "./previews/activity-waitlisted";
import EmailQuotaWarningPreview from "./previews/email-quota-warning";
import EventRegistrationRemovedPreview from "./previews/event-registration-removed";
import ProjectContributorAddedPreview from "./previews/project-contributor-added";
import ProjectContributorRemovedPreview from "./previews/project-contributor-removed";
import ProjectDeletedPreview from "./previews/project-deleted";

/**
 * `react-email dev` only lists files in the e-mails directory that default-export
 * a component. These are the dev-only entry points for the generalized
 * templates; assert each one renders its sample props so the preview sidebar
 * never silently breaks.
 */
const CASES: Array<{
	name: string;
	Preview: ComponentType;
	expectedText: readonly string[];
}> = [
	{
		name: "event-registration-removed",
		Preview: EventRegistrationRemovedPreview,
		expectedText: [
			"Maria Silva",
			"Inscrição removida",
			"Inscrição duplicada.",
		],
	},
	{
		name: "activity-enrollment-confirmed",
		Preview: ActivityEnrollmentConfirmedPreview,
		expectedText: [
			"Maria Silva",
			"Inscrição confirmada",
			"Oficina de React",
		],
	},
	{
		name: "activity-waitlisted",
		Preview: ActivityWaitlistedPreview,
		expectedText: ["Maria Silva", "Fila de espera", "3ª"],
	},
	{
		name: "activity-waitlist-promoted",
		Preview: ActivityWaitlistPromotedPreview,
		expectedText: ["Maria Silva", "Vaga conquistada"],
	},
	{
		name: "activity-waitlist-offered",
		Preview: ActivityWaitlistOfferedPreview,
		expectedText: [
			"Maria Silva",
			"Vaga oferecida",
			"11 de abril de 2026 às 20:00",
		],
	},
	{
		name: "activity-waitlist-offer-revoked",
		Preview: ActivityWaitlistOfferRevokedPreview,
		expectedText: [
			"Maria Silva",
			"Vaga desfeita",
			"Você continua na fila de espera",
		],
	},
	{
		name: "activity-enrollment-cancelled",
		Preview: ActivityEnrollmentCancelledPreview,
		expectedText: ["Maria Silva", "Inscrição cancelada"],
	},
	{
		name: "activity-enrollment-removed",
		Preview: ActivityEnrollmentRemovedPreview,
		expectedText: [
			"Maria Silva",
			"Inscrição removida",
			"Conflito de horário com outra atividade.",
		],
	},
	{
		name: "activity-updated",
		Preview: ActivityUpdatedPreview,
		expectedText: ["Maria Silva", "Atividade atualizada", "Data e local"],
	},
	{
		name: "activity-cancelled",
		Preview: ActivityCancelledPreview,
		expectedText: [
			"Maria Silva",
			"Atividade cancelada",
			"Palestrante indisponível.",
		],
	},
	{
		name: "email-quota-warning",
		Preview: EmailQuotaWarningPreview,
		expectedText: [
			"João Organizador",
			"Uso diário de e-mails",
			"do limite diário de envio de e-mails",
		],
	},
	{
		name: "project-contributor-added",
		Preview: ProjectContributorAddedPreview,
		expectedText: ["Maria Silva", "Novo acesso", "SECOMP 2026"],
	},
	{
		name: "project-contributor-removed",
		Preview: ProjectContributorRemovedPreview,
		expectedText: ["Maria Silva", "Acesso removido", "SECOMP 2026"],
	},
	{
		name: "project-deleted",
		Preview: ProjectDeletedPreview,
		expectedText: ["Maria Silva", "Acesso encerrado", "SECOMP 2026"],
	},
];

describe("react-email dev previews", () => {
	it.each(CASES)(
		"$name default-exports a component that renders its sample props",
		async ({ Preview, expectedText }) => {
			const html = await render(createElement(Preview));
			expect(html.length).toBeGreaterThan(0);
			for (const text of expectedText) {
				expect(html).toContain(text);
			}
		},
	);

	it.each(CASES)("$name exports a component", ({ Preview }) => {
		expect(typeof Preview).toBe("function");
	});
});
