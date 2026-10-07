import { notFound } from "next/navigation";
import { Suspense } from "react";

// Components
import { ActivityJoinPageContent } from "@/components/activity-join";

// API
import { getActivityStaticParams, getCachedActivity } from "@/lib/data";

/**
 * Pré-renderiza cada atividade de evento conhecido: a rota vira estática
 * (servida pela CDN) em vez de render por request. URLs de atividade
 * desconhecida continuam caindo em `notFound()`.
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
			<ActivityPageLoader params={params} />
		</Suspense>
	);
}

async function ActivityPageLoader({
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
		<ActivityJoinPageContent activity={data.activity} eventUrl={eventUrl} />
	);
}
