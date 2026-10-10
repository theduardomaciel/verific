import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

// Icons
import { ArrowLeft } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";

import {
	ActivityDetails,
	ActivityEnrollmentPanel,
	ActivityPageSkeleton,
	type ActivityDetail,
} from "@/components/activity-join";
import * as EventContainer from "@/components/landing/event-container";

// API
import {
	getActivityStaticParams,
	getCachedActivities,
	getCachedActivity,
} from "@/lib/data";

/**
 * Pré-renderiza cada atividade de evento conhecido: a rota vira estática
 * (servida pela CDN) em vez de render por request. URLs de atividade
 * desconhecida — ou de outro evento — caem em `notFound()`.
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
		<Suspense fallback={<ActivityPageShellSkeleton />}>
			<ActivityPageLoader params={params} />
		</Suspense>
	);
}

function ActivityPageShellSkeleton() {
	return (
		<EventContainer.Holder>
			<EventContainer.Content className="py-8 md:py-12">
				<ActivityPageSkeleton />
			</EventContainer.Content>
		</EventContainer.Holder>
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

	const activity = data.activity as ActivityDetail;

	// A atividade pertence a outro evento: trata como 404.
	if (activity.project?.url !== eventUrl) {
		notFound();
	}

	// Contagem pública de inscritos (via lista cacheada do evento): o
	// `getActivity` sem sessão não retorna contagem, e tudo aqui precisa
	// continuar estático — nada específico do usuário no servidor.
	const participantsCount = await getCachedActivities({
		projectUrl: eventUrl,
		pageSize: 1000,
	})
		.then(
			(result) =>
				result.activities.find((item) => item.id === activityId)
					?.participantsCount ??
				("participantsAmount" in data ? data.participantsAmount : null),
		)
		.catch(() =>
			"participantsAmount" in data ? data.participantsAmount : null,
		)
		.then((count) => count ?? null);

	return (
		<EventContainer.Holder>
			<EventContainer.Content className="py-8 md:py-12">
				<div className="container-p w-full pb-28 lg:pb-0">
					<Button
						variant="ghost"
						asChild
						className="mb-4 min-h-11 w-fit px-2"
					>
						<Link href={`/${eventUrl}/schedule#${activity.id}`}>
							<ArrowLeft className="h-4 w-4" />
							Voltar para a programação
						</Link>
					</Button>

					<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-12">
						<div className="min-w-0 text-base">
							<ActivityDetails
								activity={activity}
								participantsCount={participantsCount}
								projectUrl={eventUrl}
							/>
						</div>
						<ActivityEnrollmentPanel
							activity={activity}
							eventUrl={eventUrl}
							participantsCount={participantsCount}
						/>
					</div>
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
