"use server";

import { signIn, signOut } from "@verific/auth";

export async function loginAction(callbackUrl: string) {
	console.log("Login action", { callbackUrl });

	await signIn("google", { callbackUrl });
}

export async function signOutAction() {
	await signOut({
		redirectTo: "/",
	});
}
