import { notFound } from "next/navigation";

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

// Gate `notFound` real sobre dados 100% específicos da URL antes de
// qualquer `<Suspense>`: opta por navegação com bloqueio (mesmo padrão
// das páginas irmãs do evento + `profile/[shortId]`).
export const instant = false;

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

	return (
		<ActivityJoinModalContent
			activity={data.activity}
			eventUrl={eventUrl}
		/>
	);
}
