import type { Metadata } from "next";

// Components
import MutateActivityForm from "./form";
import { getParticipants } from "@/lib/data";

export const metadata: Metadata = {
	title: "Nova Atividade",
};

export default async function AddActivity() {
	const participants = await getParticipants({});

	return (
		<main className="p-dashboard flex min-h-screen flex-col items-center justify-start">
			<MutateActivityForm participants={participants} />
		</main>
	);
}
