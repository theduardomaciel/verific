import { notFound } from "next/navigation";
import { Suspense } from "react";

import * as EventContainer from "@/components/landing/event-container";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileBanner } from "@/components/profile/profile-banner";
import { ProfileStats } from "@/components/profile/profile-stats";
import { ProfileOwnerActions } from "@/components/profile/profile-owner-actions";
import { ProfileOwnerHidden } from "@/components/profile/profile-owner-hidden";
import { ProfileOwnerSection } from "@/components/profile/profile-owner-section";
import { ProfileOwnerTickets } from "@/components/profile/profile-owner-tickets";
import { ProfileAccountIsland } from "@/components/profile/profile-account-island";
import { getProject, getProfilePageData } from "@/lib/data";

interface ProfilePageProps {
	params: Promise<{ eventUrl: string; shortId: string }>;
}

/**
 * Perfil do participante no evento (ISR por participante+evento).
 * Slots dinâmicos: layout do evento + respostas + visibilidade.
 * - Perfis ativados: shell estático público + ilhas do dono (?me=1).
 * - Perfis desativados: mesmo URL em modo conta privado — shell estático
 *   sem nenhum dado pessoal; só o dono (via link ?me=1) carrega conteúdo.
 */
async function ProfilePageContent({ params }: ProfilePageProps) {
	const { eventUrl, shortId } = await params;
	const result = await getProject(eventUrl);

	if (!result?.project) {
		notFound();
	}

	const { project } = result;
	const profilesEnabled = Boolean(project.profilesEnabled);

	if (!profilesEnabled) {
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
								projectId={project.id}
								shortId={shortId}
							/>
						</Suspense>
					</div>
				</EventContainer.Content>
			</EventContainer.Holder>
		);
	}

	let pageData;
	try {
		pageData = await getProfilePageData(eventUrl, shortId);
	} catch {
		notFound();
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
					<ProfileBanner
						name={pageData.name}
						avatarUrl={pageData.avatarUrl}
						subtitle={slots.subtitle?.value ?? ""}
						bio={slots.bio?.value ?? null}
						socials={slots.socials}
						publicEmail={slots.email?.value ?? null}
						showBioAndSocials
						actions={
							<Suspense>
								<ProfileOwnerActions
									eventUrl={eventUrl}
									projectId={project.id}
									shortId={shortId}
								/>
							</Suspense>
						}
					/>
					{hasPublicContent ? (
						<Suspense>
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
									}}
								/>
								<Suspense>
									<ProfileOwnerHidden
										eventUrl={eventUrl}
										shortId={shortId}
									/>
								</Suspense>
							</ProfileOwnerSection>
						</Suspense>
					) : (
						<Suspense>
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

export default function EventProfilePage({ params }: ProfilePageProps) {
	return (
		<Suspense>
			<ProfilePageContent params={params} />
		</Suspense>
	);
}
