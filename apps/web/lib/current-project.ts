import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { serverClient } from "@/lib/trpc/server";

export const getCurrentProject = cache(async () => {
	const cookieStore = await cookies();
	const projectId = cookieStore.get("projectId")?.value;

	if (!projectId) {
		redirect("/account");
	}

	const { project } = await serverClient.getProject({ id: projectId });

	return project;
});
