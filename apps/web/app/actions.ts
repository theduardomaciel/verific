"use server";

import { signIn, signOut } from "@verific/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(callbackUrl: string) {
	console.log("Login action", { callbackUrl });
	await signIn("google", { callbackUrl });
}

export async function signOutAction(redirectTo: string = "/") {
	await signOut({ redirectTo });
}

export async function signOutFormAction(formData: FormData) {
	const redirectTo = (formData.get("redirectTo") as string) || "/";
	await signOut({ redirectTo });
}

export async function updateProjectCookies(
	projectId: string,
	projectUrl: string,
	projectDate: string,
) {
	const cookieStore = await cookies();
	cookieStore.set("projectId", projectId);
	cookieStore.set("projectUrl", projectUrl);
	cookieStore.set("projectDate", projectDate);

	redirect("/dashboard");
}
