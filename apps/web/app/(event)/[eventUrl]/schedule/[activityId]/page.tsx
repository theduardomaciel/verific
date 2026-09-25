import { notFound } from "next/navigation";

// Components
import { ActivityJoinPageContent } from "@/components/activity-join";

// API
import { getCachedActivity } from "@/lib/data";

export default async function Page({
	params,
}: {
	params: Promise<{ activityId: string; eventUrl: string }>;
}) {
	const { activityId, eventUrl } = await params;

	const data = await getCachedActivity({ activityId }).catch(() => null);

	if (!data?.activity) {
		notFound();
	}

	// O conteúdo abaixo é a "visualização de página inteira" do modal
	return (
		<ActivityJoinPageContent
			activity={data.activity}
			eventUrl={eventUrl}
		/>
	);
}
