"use client";

// Components
import MutateActivityForm from "@/components/forms/MutateActivityForm";

// Hooks
import { useDashboard } from "@/components/dashboard/dashboard-context";

export function CreateActivityContent() {
	const { projectId } = useDashboard();

	return (
		<main className="container-p py-container-v flex min-h-screen flex-col items-center justify-start">
			<MutateActivityForm projectId={projectId} />
		</main>
	);
}
