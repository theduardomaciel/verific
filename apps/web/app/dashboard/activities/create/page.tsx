import type { Metadata } from "next";

// Components
import { CreateActivityContent } from "./content";

export const metadata: Metadata = {
	title: "Nova Atividade",
};

export default function AddActivity() {
	return <CreateActivityContent />;
}
