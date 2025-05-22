"use server";

import { signIn, signOut } from "@verific/auth";
import { z } from "zod";
import { serverClient } from "@/lib/trpc/server";

const updateProjectSchema = z.object({
	id: z.string(),
	name: z.string().optional(),
	url: z.string().optional(),
	address: z.string().optional(),
	latitude: z.coerce.number().optional(),
	longitude: z.coerce.number().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
});

export async function loginAction(callbackUrl: string) {
	console.log("Login action", { callbackUrl });

	await signIn("google", { callbackUrl });
}

export async function signOutAction() {
	await signOut({
		redirectTo: "/",
	});
}

export async function updateProject() {
	try {
		/* const data = Object.fromEntries(formData.entries());
		const parsed = updateProjectSchema.safeParse(data);
		if (!parsed.success) {
			return { error: parsed.error.errors[0].message };
		}
		const input: any = { ...parsed.data };
		// Se endereço, latitude e longitude presentes, monta address string
		if (input.latitude && input.longitude && input.address) {
			input.address = input.address;
		}
		// Se datas presentes, converte para Date
		if (input.startDate) input.startDate = new Date(input.startDate);
		if (input.endDate) input.endDate = new Date(input.endDate);
		await serverClient.updateProject(input); */
		return { error: null };
	} catch (e: any) {
		return { error: e.message || "Erro ao atualizar projeto" };
	}
}
