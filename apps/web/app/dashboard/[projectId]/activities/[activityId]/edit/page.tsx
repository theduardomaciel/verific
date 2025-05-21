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
	params: Promise<{ projectId: string; activityId: string }>;
}) {
	const { projectId, activityId } = await params;

	const { activity } = await serverClient.getActivity({
		activityId,
	});

	return (
		<main className="container-p py-container-v flex min-h-screen flex-col items-center justify-start">
			<MutateActivityForm projectId={projectId} activity={activity} />
		</main>
	);
}
