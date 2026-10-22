"use client";

import { Skeleton } from "@/components/ui/skeleton";

// Hooks
import { useDashboard } from "@/components/dashboard/dashboard-context";
// Components
import MutateActivityForm from "@/components/forms/MutateActivityForm";
import { ActivityRegistrationFormAction } from "@/components/forms/MutateActivityForm/registration-form-action";

// API
import { trpc } from "@/lib/trpc/react";

export function EditActivityContent({ activityId }: { activityId: string }) {
	const { projectId } = useDashboard();

	const { data, isPending, isError } = trpc.getActivity.useQuery(
		{ activityId },
		{ staleTime: 2 * 60 * 1000, refetchOnWindowFocus: false },
	);

	if (isPending) {
		return (
			<main className="container-p py-container-v flex min-h-[calc(100dvh-var(--dashboard-header-height))] flex-col items-center justify-start">
				<Skeleton className="h-96 w-full" />
			</main>
		);
	}

	if (isError || !data) {
		return (
			<main className="container-p py-container-v flex min-h-[calc(100dvh-var(--dashboard-header-height))] flex-col items-center justify-start">
				<p className="text-muted-foreground text-sm">
					Não foi possível carregar a atividade. Tente recarregar a
					página.
				</p>
			</main>
		);
	}

	const { activity, projectStartDate, projectEndDate } = data;

	return (
		<main className="container-p py-container-v flex min-h-[calc(100dvh-var(--dashboard-header-height))] flex-col items-center justify-start">
			<MutateActivityForm
				projectId={projectId}
				activity={activity}
				startDate={projectStartDate!}
				endDate={projectEndDate!}
				registrationFormAction={
					<ActivityRegistrationFormAction
						activityId={activity.id}
						form={activity.form}
					/>
				}
			/>
		</main>
	);
}
