"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidateTag, updateTag } from "next/cache";

import { auth } from "@verific/auth";

export async function loginAction(callbackUrl: string) {
	const safeCallbackUrl = callbackUrl.startsWith("/")
		? callbackUrl
		: "/account";
	const result = await auth.api.signInSocial({
		body: {
			provider: "google",
			callbackURL: safeCallbackUrl,
		},
		headers: await headers(),
	});

	redirect(result.url ?? safeCallbackUrl);
}

export async function signOutAction(redirectTo: string = "/") {
	await auth.api.signOut({
		headers: await headers(),
	});
	redirect(redirectTo);
}

export async function signOutFormAction(formData: FormData) {
	const redirectTo = (formData.get("redirectTo") as string) || "/";
	await auth.api.signOut({
		headers: await headers(),
	});
	redirect(redirectTo);
}

export async function updateProjectCookies(projectId: string) {
	const cookieStore = await cookies();
	cookieStore.set("projectId", projectId, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
	});

	redirect("/dashboard");
}

export async function revalidateActivities() {
	revalidateTag("activities", "max");
}

export async function revalidateParticipants() {
	revalidateTag("participants", "max");
}

export async function revalidateParticipantActivities(userId: string) {
	updateTag(`activities-from-participant-${userId}`);
}

export async function revalidateParticipantEnrollment(userId: string) {
	updateTag(`participant-enrollment-${userId}`);
}

export async function revalidateSubscribedActivitiesIdsFromParticipant(
	userId: string,
) {
	updateTag(`subscribed-activities-ids-from-participant-${userId}`);
}
