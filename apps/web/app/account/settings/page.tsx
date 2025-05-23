import { cookies } from "next/headers";
// Components
import { AccountSettingsGeneral } from "@/app/account/settings/form";
// API
import { serverClient } from "@/lib/trpc/server";

export default async function AccountSettings() {
	const cookieStore = await cookies();
	const accountId = cookieStore.get("accountId")?.value;

	// Buscar dados do usuário do servidor
	const user = await serverClient.getUser();

	return <AccountSettingsGeneral user={user} />;
}
