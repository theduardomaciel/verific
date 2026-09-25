import { Suspense } from "react";
import { redirect } from "next/navigation";

// Components
import { AccountSettingsGeneral } from "@/app/account/settings/form";
import { Skeleton } from "@/components/ui/skeleton";

// API
import { getSession } from "@/lib/session";
import { getCachedUser } from "@/lib/data";

function AccountSettingsSkeleton() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-40 w-full" />
			<Skeleton className="h-40 w-full" />
			<Skeleton className="h-40 w-full" />
		</div>
	);
}

async function AccountSettingsContent() {
	const session = await getSession();

	if (!session?.user.id) {
		redirect("/auth");
	}

	// Cached across navigations (`"use cache"` keyed by userId).
	// Going back to this tab revalidates in the background instead of
	// refetching from scratch, so the skeleton barely flashes.
	const user = await getCachedUser(session.user.id);

	return <AccountSettingsGeneral user={user} />;
}

export default function AccountSettings() {
	return (
		<Suspense fallback={<AccountSettingsSkeleton />}>
			<AccountSettingsContent />
		</Suspense>
	);
}
