"use client";

import { useDashboard } from "@/components/dashboard/dashboard-context";
import MutateActivityForm from "@/components/forms/MutateActivityForm";

export function CreateActivityContent() {
	const { projectId } = useDashboard();

	return (
		<main className="container-p py-container-v flex min-h-[calc(100dvh-var(--dashboard-header-height))] flex-col items-center justify-start">
			<MutateActivityForm
				projectId={projectId}
				enableConfigureAfterSave
			/>
		</main>
	);
}
