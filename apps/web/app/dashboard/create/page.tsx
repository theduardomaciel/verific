import { ToDo } from "@/components/to-do";

import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Nova Atividade",
};

export default async function AddActivity() {
	return (
		<main className="flex h-screen flex-col items-center justify-center">
			<ToDo />
		</main>
	);
}
