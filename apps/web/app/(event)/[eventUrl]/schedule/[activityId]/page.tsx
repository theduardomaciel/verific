import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

// Icons
import { ArrowLeft } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";

import {
	ActivityDetailContent,
	ActivityPageSkeleton,
	type ActivityDetail,
} from "@/components/activity-join";
import * as EventContainer from "@/components/landing/event-container";

// API
import { getActivityStaticParams, getCachedActivity } from "@/lib/data";

/**
 * Pré-renderiza cada atividade de evento conhecido: a rota vira estática
 * (servida pela CDN) em vez de render por request. URLs de atividade
 * desconhecida — ou de outro evento — caem em `notFound()`.
 */
export async function generateStaticParams() {
	return getActivityStaticParams();
}

/**
 * Conteúdo 100% cacheado (`getCachedActivity`): exige página completa
 * estática também para atividades criadas depois do build. O primeiro
 * acesso gera e grava a página; os seguintes saem da CDN sem invocar
 * função.
 */
export const ensureStatic = "navigation";

export default function Page({
	params,
}: PageProps<"/[eventUrl]/schedule/[activityId]">) {
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
}: Pick<PageProps<"/[eventUrl]/schedule/[activityId]">, "params">) {
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

	// Contagem pública inicial: vem do próprio `getActivity` anônimo
	// (participantes + ofertas de fila pendentes). Ela é apenas o fallback
	// de primeiro paint; `ActivityDetailContent` atualiza o número com a
	// query pública `getActivityAvailability` (s-maxage=60), que não
	// invalida o shell estático a cada join/check-in.
	//
	// `data.participantsAmount` de nível superior só existe na branch
	// logada; sem o fallback a contagem ficava `null`, e `isActivityFull`
	// lê contagem desconhecida como lotada.
	const participantsCount =
		"participantsAmount" in data
			? (data.participantsAmount ?? null)
			: (("participantsAmount" in activity
					? activity.participantsAmount
					: null) ?? null);

	return (
		<EventContainer.Holder>
			<EventContainer.Content className="py-8 md:py-12">
				<div className="container-p w-full pb-28 lg:pb-0">
					<Button
						variant="ghost"
						asChild
						className="mb-4 min-h-11 w-fit px-2"
					>
						<Link
							href={`/${eventUrl}/schedule#${activity.id}`}
							prefetch={false}
						>
							<ArrowLeft className="h-4 w-4" />
							Voltar para a programação
						</Link>
					</Button>

					<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-12">
						<ActivityDetailContent
							activity={activity}
							eventUrl={eventUrl}
							initialParticipantsCount={participantsCount}
						/>
					</div>
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
