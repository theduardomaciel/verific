// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VersionsCard } from "@/app/dashboard/forms/components/versions-card";
import type { Version } from "@/app/dashboard/forms/types";

afterEach(cleanup);

function makeVersion(overrides: Partial<Version> = {}): Version {
	return {
		id: "v1",
		projectId: "p1",
		version: 1,
		isPublished: false,
		createdBy: null,
		createdAt: new Date(),
		publishedAt: null,
		fieldsCount: 0,
		...overrides,
	} as Version;
}

const baseProps = {
	onSelect: vi.fn(),
	onCreate: vi.fn(),
	onDuplicate: vi.fn(),
	onDelete: vi.fn(),
	isCreating: false,
	isDeleting: false,
};

describe("VersionsCard delete", () => {
	it("shows Excluir for an unpublished selected version and confirms deletion", async () => {
		const draft = makeVersion({ id: "draft-id", version: 2 });
		const onDelete = vi.fn();
		render(
			<VersionsCard
				{...baseProps}
				versions={[makeVersion(), draft]}
				selectedId={draft.id}
				onDelete={onDelete}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: /^excluir$/i }));
		expect(screen.getByText("Excluir v2?")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /^excluir versão$/i }));
		await waitFor(() => expect(onDelete).toHaveBeenCalledWith(draft));
	});

	it("does not call onDelete when the confirmation is cancelled", async () => {
		const draft = makeVersion({ id: "draft-id", version: 2 });
		const onDelete = vi.fn();
		render(
			<VersionsCard
				{...baseProps}
				versions={[draft]}
				selectedId={draft.id}
				onDelete={onDelete}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: /^excluir$/i }));
		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		await waitFor(() =>
			expect(screen.queryByText("Excluir v2?")).not.toBeInTheDocument(),
		);
		expect(onDelete).not.toHaveBeenCalled();
	});

	it("hides Excluir for a published selected version", () => {
		const published = makeVersion({
			id: "pub-id",
			version: 1,
			isPublished: true,
		});
		render(
			<VersionsCard
				{...baseProps}
				versions={[published]}
				selectedId={published.id}
			/>,
		);

		expect(
			screen.queryByRole("button", { name: /^excluir$/i }),
		).not.toBeInTheDocument();
	});
});
