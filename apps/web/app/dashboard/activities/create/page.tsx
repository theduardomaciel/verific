import { cookies } from "next/headers";
import type { Metadata } from "next";

// Components
import MutateActivityForm from "@/components/forms/MutateActivityForm";

export const metadata: Metadata = {
	title: "Nova Atividade",
};

export default async function AddActivity() {
	const cookieStore = await cookies();
	const projectId = cookieStore.get("projectId")!.value;

	return (
		<main className="container-p py-container-v flex min-h-screen flex-col items-center justify-start">
			<MutateActivityForm projectId={projectId} />
		</main>
	);
}
