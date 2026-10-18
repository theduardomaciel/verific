import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import * as EventContainer from "@/components/landing/event-container";
import { ProfileAccountIsland } from "@/components/profile/profile-account-island";
import { ProfileBanner } from "@/components/profile/profile-banner";
import { ProfileOwnerActions } from "@/components/profile/profile-owner-actions";
import { ProfileOwnerHidden } from "@/components/profile/profile-owner-hidden";
import { ProfileOwnerSection } from "@/components/profile/profile-owner-section";
import { ProfileOwnerTickets } from "@/components/profile/profile-owner-tickets";
import { ProfileStats } from "@/components/profile/profile-stats";
import { ProfileVisitRecorder } from "@/components/profile/profile-visit-recorder";

import {
	getEventStaticParams,
	getProject,
	getProfilePageData,
} from "@/lib/data";
import { resolveProfilePageData } from "@/lib/profile-page-data";

import { ProfilePageSkeleton } from "./skeleton";

interface ProfilePageProps {
	params: Promise<{ eventUrl: string; shortId: string }>;
}

// `shortId` é ilimitado e as ilhas do dono chegam por `?me=1`: a navegação
// pode bloquear, então opta por "instant = false". O gate `notFound` roda
// antes do `<Suspense>` abaixo e não pode ser adiado.
export const instant = false;

/**
 * Com `cacheComponents`, uma rota só vira ISR (grava o HTML na primeira
 * visita e serve as seguintes do cache) se declarar `generateStaticParams`.
 * Sem isso, `params` é dado de runtime: **toda** visita republica o App
 * Shell e a resposta sai `Cache-Control: no-store`, mesmo com todo o dado
 * em `"use cache"`.
 *
 * O universo de `shortId` é ilimitado (um por participante) — não há como
 * enumerá-lo no build. A amostra abaixo existe só para registrar a rota
 * como ISR-ável; é reconhecida por `BUILD_SAMPLE_SHORT_ID` e cai em
 * `notFound()`. As URLs reais são gravadas em disco na primeira visita e
 * servidas do cache nas seguintes.
 */
const BUILD_SAMPLE_SHORT_ID = "__placeholder__";

export async function generateStaticParams() {
	const events = await getEventStaticParams();

	return events.map(({ eventUrl }) => ({
		eventUrl,
		shortId: BUILD_SAMPLE_SHORT_ID,
	}));
}

type ProfileServerData = {
	eventUrl: string;
	shortId: string;
	projectId: string;
	profilesEnabled: boolean;
	pageData: Awaited<ReturnType<typeof getProfilePageData>> | null;
};

/**
 * Checks (`getProject`/`getProfilePageData` + `notFound`) run in the
 * page export below, before any `<Suspense>` boundary renders — real
 * 404s instead of streamed soft-404s. This body only presents data that
 * is already resolved; dynamism lives in the owner islands.
 */
function ProfileBody({
	eventUrl,
	shortId,
	projectId,
	profilesEnabled,
	pageData,
}: ProfileServerData) {
	if (!profilesEnabled || !pageData) {
		return (
			<EventContainer.Holder>
				<EventContainer.Content>
					<div className="container-d mb-8 flex w-full flex-col gap-4 md:gap-12">
						<Suspense
							fallback={
								<Skeleton className="h-96 w-full rounded-3xl" />
							}
						>
							<ProfileAccountIsland
								eventUrl={eventUrl}
								projectId={projectId}
								shortId={shortId}
							/>
						</Suspense>
					</div>
				</EventContainer.Content>
			</EventContainer.Holder>
		);
	}

	const { slots, modules } = pageData;
	const hasPublicContent =
		slots.stats.length > 0 ||
		modules.connectionsEnabled ||
		modules.badgesEnabled;

	return (
		<EventContainer.Holder>
			<EventContainer.Content>
				<div className="container-p mb-8 flex w-full flex-col gap-4 md:gap-12">
					{modules.connectionsEnabled && (
						<Suspense fallback={null}>
							<ProfileVisitRecorder
								eventUrl={eventUrl}
								shortId={shortId}
							/>
						</Suspense>
					)}
					<ProfileBanner
						name={pageData.name}
						avatarUrl={pageData.avatarUrl}
						subtitle={slots.subtitle?.value ?? ""}
						bio={slots.bio?.value ?? null}
						socials={slots.socials}
						publicEmail={slots.email?.value ?? null}
						showBioAndSocials
						actions={
							<Suspense fallback={null}>
								<ProfileOwnerActions
									eventUrl={eventUrl}
									projectId={projectId}
									shortId={shortId}
								/>
							</Suspense>
						}
					/>
					{hasPublicContent ? (
						<Suspense
							fallback={
								<Skeleton className="h-40 w-full rounded-3xl" />
							}
						>
							<ProfileOwnerSection
								eventUrl={eventUrl}
								shortId={shortId}
							>
								<ProfileStats
									data={{
										name: pageData.name,
										stats: slots.stats,
										showConnections:
											modules.connectionsEnabled,
										showBadges: modules.badgesEnabled,
										connections: pageData.connections,
									}}
								/>
								<Suspense fallback={null}>
									<ProfileOwnerHidden
										eventUrl={eventUrl}
										shortId={shortId}
									/>
								</Suspense>
							</ProfileOwnerSection>
						</Suspense>
					) : (
						<Suspense fallback={null}>
							<ProfileOwnerHidden
								eventUrl={eventUrl}
								shortId={shortId}
							/>
						</Suspense>
					)}
					<Suspense
						fallback={
							<Skeleton className="min-h-64 w-full rounded-3xl" />
						}
					>
						<ProfileOwnerTickets
							eventUrl={eventUrl}
							shortId={shortId}
						/>
					</Suspense>
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}

/**
 * Perfil do participante no evento (ISR por participante+evento).
 * Slots dinâmicos: layout do evento + respostas + visibilidade.
 * - Perfis ativados: shell estático público + ilhas do dono (?me=1).
 * - Perfis desativados: mesmo URL em modo conta privado — shell estático
 *   sem nenhum dado pessoal; só o dono (via link ?me=1) carrega conteúdo.
 */
export default async function EventProfilePage({ params }: ProfilePageProps) {
	const { eventUrl, shortId } = await params;

	// Amostra do build (ver `generateStaticParams`): nunca é um perfil real.
	// Tratada ANTES de qualquer leitura cacheada — um erro lançado de dentro
	// de um corpo `"use cache"` no prerender do build derruba o export, e não
	// dá para converter em 404 depois.
	if (shortId === BUILD_SAMPLE_SHORT_ID) {
		notFound();
	}

	const result = await getProject(eventUrl);

	if (!result?.project) {
		notFound();
	}

	const { project } = result;
	const profilesEnabled = Boolean(project.profilesEnabled);

	// Apenas o NOT_FOUND do procedimento vira `null` (e então 404); qualquer
	// outro erro propaga. Com a rota em ISR, transformar falha transitória
	// (timeout, bug) em 404 prenderia o perfil válido no cache. O `notFound()`
	// fica no corpo, e não dentro do `catch`: é o único formato que o
	// prerender do build aceita — o `notFound()` lançado de dentro do `catch`
	// deixa o erro original escapar e derruba o build.
	const pageData = profilesEnabled
		? await resolveProfilePageData(getProfilePageData(eventUrl, shortId))
		: null;

	if (profilesEnabled && !pageData) {
		notFound();
	}

	return (
		<Suspense fallback={<ProfilePageSkeleton />}>
			<ProfileBody
				eventUrl={eventUrl}
				shortId={shortId}
				projectId={project.id}
				profilesEnabled={profilesEnabled}
				pageData={pageData}
			/>
		</Suspense>
	);
}
