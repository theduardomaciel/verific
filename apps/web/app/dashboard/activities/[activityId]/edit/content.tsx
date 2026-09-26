"use client";

// Components
import MutateActivityForm from "@/components/forms/MutateActivityForm";
import { Skeleton } from "@/components/ui/skeleton";

// Hooks
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { useDelayedPending } from "@/hooks/use-delayed-pending";

// API
import { trpc } from "@/lib/trpc/react";

export function EditActivityContent({ activityId }: { activityId: string }) {
	const { projectId } = useDashboard();

	const { data, isPending, isError } = trpc.getActivity.useQuery(
		{ activityId },
	);

	const showPending = useDelayedPending(isPending);

	if (isError) {
		return (
			<main className="container-p py-container-v flex min-h-screen flex-col items-center justify-start">
				<p className="text-muted-foreground text-sm">
					Não foi possível carregar a atividade. Tente recarregar a
					página.
				</p>
			</main>
		);
	}

	if (!data) {
		return showPending ? (
			<main className="container-p py-container-v flex min-h-screen flex-col items-center justify-start">
				<Skeleton className="h-96 w-full" />
			</main>
		) : null;
	}

	const { activity, projectStartDate, projectEndDate } = data;

	return (
		<main className="container-p py-container-v flex min-h-screen flex-col items-center justify-start">
			<MutateActivityForm
				projectId={projectId}
				activity={activity}
				startDate={projectStartDate!}
				endDate={projectEndDate!}
			/>
		</main>
	);
}
