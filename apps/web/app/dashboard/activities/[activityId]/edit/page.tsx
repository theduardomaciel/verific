import type { Metadata } from "next";

// Components
import { EditActivityContent } from "./content";

export const metadata: Metadata = {
	title: "Editar Atividade",
};

export default async function EditActivity({
	params,
}: {
	params: Promise<{ activityId: string }>;
}) {
	const { activityId } = await params;

	return <EditActivityContent activityId={activityId} />;
}
