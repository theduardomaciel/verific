import { notFound } from "next/navigation";
import { Suspense } from "react";

import * as EventContainer from "@/components/landing/event-container";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileBanner } from "@/components/profile/profile-banner";
import { ProfileInfo } from "@/components/profile/profile-info";
import { ProfileOwnerActions } from "@/components/profile/profile-owner-actions";
import { ProfileOwnerSection } from "@/components/profile/profile-owner-section";
import { ProfileOwnerTickets } from "@/components/profile/profile-owner-tickets";
import { ProfileAccountIsland } from "@/components/profile/profile-account-island";
import { getProject, getPublicProfile } from "@/lib/data";

interface ProfilePageProps {
	params: Promise<{ eventUrl: string; shortId: string }>;
}

/**
 * Perfil do participante no evento (ISR por participante+evento).
 * - Perfis ativados: shell estático com conteúdo público (privacidade
 *   aplicada no servidor) + ilhas do dono (?me=1).
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
							fallback={<Skeleton className="h-96 w-full rounded-3xl" />}
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

	let publicProfile;
	try {
		publicProfile = await getPublicProfile(eventUrl, shortId);
	} catch {
		notFound();
	}

	return (
		<EventContainer.Holder>
			<EventContainer.Content>
				<div className="container-d mb-8 flex w-full flex-col gap-4 md:gap-12">
					<ProfileBanner
						name={publicProfile.name}
						avatarUrl={publicProfile.avatar.url}
						subtitle={publicProfile.roleTitle ?? ""}
						bio={publicProfile.bio}
						socials={publicProfile.socials}
						publicEmail={publicProfile.publicEmail}
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
					<Suspense>
						<ProfileOwnerSection eventUrl={eventUrl} shortId={shortId}>
							<ProfileInfo data={publicProfile} />
						</ProfileOwnerSection>
					</Suspense>
					<Suspense
						fallback={<Skeleton className="min-h-64 w-full rounded-3xl" />}
					>
						<ProfileOwnerTickets eventUrl={eventUrl} shortId={shortId} />
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
