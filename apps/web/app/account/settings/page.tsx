// Components
import { AccountSettingsGeneral } from "@/app/account/settings/form";

export default function AccountSettings() {
	// Intentionally no server fetch / Suspense here.
	// Data lives in the TanStack Query client cache, so soft navigations
	// render instantly from cache (skeleton only on first load / hard refresh).
	return <AccountSettingsGeneral />;
}
