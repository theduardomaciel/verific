// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { socialMock, toastErrorMock } = vi.hoisted(() => ({
	socialMock: vi.fn(),
	toastErrorMock: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
	authClient: { signIn: { social: socialMock } },
}));
vi.mock("sonner", () => ({ toast: { error: toastErrorMock } }));
vi.mock("@/public/icons/google.svg", () => ({ default: () => null }));

import GoogleButton from "./GoogleButton";

describe("GoogleButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		document.cookie = "verific_has_session=; max-age=0; path=/";
	});
	afterEach(cleanup);

	it("inicia o login pelo HTTP com o destino saneado e grava o marcador", async () => {
		socialMock.mockResolvedValue({ data: {}, error: null });
		render(<GoogleButton callbackUrl="/.//evil.com" />);

		fireEvent.click(screen.getByRole("button", { name: /Google/ }));

		await vi.waitFor(() => expect(socialMock).toHaveBeenCalledTimes(1));
		expect(socialMock).toHaveBeenCalledWith({
			provider: "google",
			callbackURL: "/account",
		});
		expect(document.cookie).toContain("verific_has_session=1");
	});

	it("com erro (ex.: 429), reabilita o botão e avisa", async () => {
		socialMock.mockResolvedValue({ data: null, error: { status: 429 } });
		render(<GoogleButton callbackUrl="/dashboard" />);
		const button = screen.getByRole("button", { name: /Google/ });

		fireEvent.click(button);

		await vi.waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
		expect(toastErrorMock.mock.calls[0]![0]).toMatch(/Muitas tentativas/);
		expect(button).toBeEnabled();
	});
});
