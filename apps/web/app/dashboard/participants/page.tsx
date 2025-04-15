import { ToDo } from "@/components/to-do";

import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Participantes",
};

export default async function Participants() {
	return (
		<main className="flex h-screen flex-col items-center justify-center">
			<ToDo />
		</main>
	);
}
