import { cookies } from "next/headers";
import type { Metadata } from "next";

// Components
import MutateActivityForm from "@/components/forms/MutateActivityForm";

// API
import { serverClient } from "@/lib/trpc/server";

export const metadata: Metadata = {
	title: "Editar Atividade",
};

export default async function EditActivity({
	params,
}: {
	params: Promise<{ activityId: string }>;
}) {
	const cookieStore = await cookies();
	const projectId = cookieStore.get("projectId")!.value;

	const { activityId } = await params;

	const { activity, projectStartDate, projectEndDate } =
		await serverClient.getActivity({
			activityId,
		});

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
