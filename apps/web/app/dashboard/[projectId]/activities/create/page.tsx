import type { Metadata } from "next";

// Components
import MutateActivityForm from "@/components/forms/MutateActivityForm";

export const metadata: Metadata = {
	title: "Nova Atividade",
};

export default async function AddActivity({
	params,
}: {
	params: Promise<{ projectId: string }>;
}) {
	const { projectId } = await params;

	return (
		<main className="container-p py-container-v flex min-h-screen flex-col items-center justify-start">
			<MutateActivityForm projectId={projectId} />
		</main>
	);
}
