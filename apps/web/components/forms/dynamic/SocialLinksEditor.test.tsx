// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SOCIAL_SERVICES } from "@verific/drizzle/profile-layout";
import {
	SocialLinksEditor,
	type SocialEntry,
} from "./SocialLinksEditor";

vi.mock("@/public/icons/github.svg", () => ({ default: () => null }));
vi.mock("@/public/icons/instagram.svg", () => ({ default: () => null }));
vi.mock("@/public/icons/linkedin.svg", () => ({ default: () => null }));
vi.mock("@/public/icons/twitter.svg", () => ({ default: () => null }));
vi.mock("@/public/icons/lattes.svg", () => ({ default: () => null }));

afterEach(() => {
	cleanup();
	// Radix leaves `pointer-events: none` on <body> in jsdom when a
	// select unmounts while open.
	document.body.style.pointerEvents = "";
});

// jsdom lacks these; Radix Select calls them on open/select.
if (!Element.prototype.hasPointerCapture) {
	Element.prototype.hasPointerCapture = () => false;
	Element.prototype.setPointerCapture = () => {};
	Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
	Element.prototype.scrollIntoView = () => {};
}

function Harness({ initial }: { initial: SocialEntry[] }) {
	const [value, setValue] = useState<SocialEntry[]>(initial);
	return (
		<SocialLinksEditor
			services={[...SOCIAL_SERVICES]}
			value={value}
			onChange={setValue}
		/>
	);
}

describe("SocialLinksEditor remove-then-list", () => {
	it("omits still-added services from other rows after a removal", async () => {
		const user = userEvent.setup();
		const all: SocialEntry[] = SOCIAL_SERVICES.map((s) => ({
			service: s.id,
			value: `@${s.id}`,
		}));
		render(<Harness initial={all} />);

		// Sanity: 6 rows, add button disabled (all used).
		expect(screen.getAllByRole("combobox")).toHaveLength(
			SOCIAL_SERVICES.length,
		);
		expect(
			screen.getByRole("button", { name: /adicionar link/i }),
		).toBeDisabled();

		// Remove the GitHub row.
		const removeButtons = screen.getAllByRole("button", {
			name: "Remover link",
		});
		await user.click(removeButtons[0]!);

		await waitFor(() =>
			expect(screen.getAllByRole("combobox")).toHaveLength(
				SOCIAL_SERVICES.length - 1,
			),
		);
		expect(
			screen.getByRole("button", { name: /adicionar link/i }),
		).toBeEnabled();

		// Open the second remaining row's select (LinkedIn).
		const triggers = screen.getAllByRole("combobox");
		expect(triggers.map((t) => t.textContent)).toEqual([
			"Instagram",
			"LinkedIn",
			"X (antigo Twitter)",
			"Lattes",
			"Site",
		]);
		await user.click(triggers[1]!);

		const options = await screen.findAllByRole("option");
		const labels = options.map((o) => o.textContent);

		// GitHub was removed, so it must be offered again...
		// ...alongside this row's own service — and nothing else.
		expect(labels).toEqual(["GitHub", "LinkedIn"]);
	});

	it("keeps lists consistent when changing a selection and re-adding", async () => {
		const user = userEvent.setup();
		render(
			<Harness
				initial={[
					{ service: "github", value: "@octocat" },
					{ service: "instagram", value: "@insta" },
				]}
			/>,
		);

		// Change row 0 from GitHub to LinkedIn via the UI.
		await user.click(screen.getAllByRole("combobox")[0]!);
		await user.click(
			await screen.findByRole("option", { name: "LinkedIn" }),
		);
		await waitFor(() =>
			expect(
				screen.getAllByRole("combobox").map((t) => t.textContent),
			).toEqual(["LinkedIn", "Instagram"]),
		);

		// Row 1 (Instagram) must no longer offer LinkedIn, but GitHub is free.
		await user.click(screen.getAllByRole("combobox")[1]!);
		let labels = (await screen.findAllByRole("option")).map(
			(o) => o.textContent,
		);
		expect(labels).toEqual([
			"GitHub",
			"Instagram",
			"X (antigo Twitter)",
			"Lattes",
			"Site",
		]);
		await user.keyboard("{Escape}");

		// Remove row 0, then re-add: the freed service comes back once.
		await user.click(
			screen.getAllByRole("button", { name: "Remover link" })[0]!,
		);
		await waitFor(() =>
			expect(screen.getAllByRole("combobox")).toHaveLength(1),
		);
		await user.click(
			screen.getByRole("button", { name: /adicionar link/i }),
		);
		await waitFor(() =>
			expect(
				screen.getAllByRole("combobox").map((t) => t.textContent),
			).toEqual(["Instagram", "GitHub"]),
		);
		expect(
			screen.getByRole("button", { name: /adicionar link/i }),
		).toBeEnabled();
	});

	it("keeps every row's service when removing the second-to-last row", async () => {
		const user = userEvent.setup();
		const all: SocialEntry[] = SOCIAL_SERVICES.map((s) => ({
			service: s.id,
			value: `@${s.id}`,
		}));
		render(<Harness initial={all} />);

		// Remove the second-to-last row (Lattes).
		const removeButtons = screen.getAllByRole("button", {
			name: "Remover link",
		});
		expect(removeButtons).toHaveLength(SOCIAL_SERVICES.length);
		await user.click(removeButtons[SOCIAL_SERVICES.length - 2]!);

		await waitFor(() =>
			expect(screen.getAllByRole("combobox")).toHaveLength(
				SOCIAL_SERVICES.length - 1,
			),
		);

		// Every remaining row must still show its own service —
		// in particular the last row must still be "Site", not "GitHub".
		expect(
			screen.getAllByRole("combobox").map((t) => t.textContent),
		).toEqual([
			"GitHub",
			"Instagram",
			"LinkedIn",
			"X (antigo Twitter)",
			"Site",
		]);
		// And the inputs must still belong to the right rows.
		expect(
			screen
				.getAllByRole("textbox")
				.map((t) => (t as HTMLInputElement).value),
		).toEqual(["@github", "@instagram", "@linkedin", "@x", "@website"]);
	});
});
