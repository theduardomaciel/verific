"use server";

import { signIn } from "@verific/auth";

export async function login(callbackUrl?: string) {
	await signIn("google", {
		callbackUrl: callbackUrl || "/auth",
	});
}
