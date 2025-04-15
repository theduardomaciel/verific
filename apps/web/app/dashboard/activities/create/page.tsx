import type { Metadata } from "next";

// Components
import MutateActivityForm from "./form";

export const metadata: Metadata = {
	title: "Nova Atividade",
};

export default async function AddActivity() {
	return (
		<main className="p-dashboard flex min-h-screen flex-col items-center justify-start">
			<MutateActivityForm />
		</main>
	);
}
