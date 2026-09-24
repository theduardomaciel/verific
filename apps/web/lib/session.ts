import { headers } from "next/headers";

import { auth } from "@verific/auth";

export async function getSession() {
	return auth.api.getSession({
		headers: await headers(),
	});
}
