import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ActivityJoinModalContent } from "@/components/activity-join";

// API
import { getActivityStaticParams, getCachedActivity } from "@/lib/data";

/**
 * Mesmos params da rota cheia: o modal também é pré-renderizado por
 * atividade, então a interceptação navega sobre saída estática.
 */
export async function generateStaticParams() {
	return getActivityStaticParams();
}

export default function Page({
	params,
}: {
	params: Promise<{ activityId: string; eventUrl: string }>;
}) {
	return (
		<Suspense>
			<ActivityModalLoader params={params} />
		</Suspense>
	);
}

async function ActivityModalLoader({
	params,
}: {
	params: Promise<{ activityId: string; eventUrl: string }>;
}) {
	const { activityId, eventUrl } = await params;

	const data = await getCachedActivity({ activityId }).catch(() => null);

	if (!data?.activity) {
		notFound();
	}

	return (
		<ActivityJoinModalContent
			activity={data.activity}
			eventUrl={eventUrl}
		/>
	);
}
