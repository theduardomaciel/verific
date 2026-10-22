import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Trophy } from "lucide-react";

import {
	parseGamificationConfig,
	type GamificationConfig,
} from "@verific/drizzle/gamification";
import { parseEventTheme } from "@verific/drizzle/theme";

import { RankingContent } from "@/components/gamification/ranking-content";
import * as EventContainer from "@/components/landing/event-container";

import { getProject } from "@/lib/data";

import { RankingPageSkeleton } from "./skeleton";

interface Props {
	params: Promise<{ eventUrl: string }>;
}

type RankingProject = NonNullable<
	Awaited<ReturnType<typeof getProject>>
>["project"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { eventUrl } = await params;
	const result = await getProject(eventUrl);
	if (!result?.project) return { title: "Ranking" };

	return {
		title: `Ranking · ${result.project.name}`,
		description: `Veja os participantes que mais se engajaram em ${result.project.name}.`,
	};
}

function RankingBody({
	eventUrl,
	project,
	config,
}: {
	eventUrl: string;
	project: RankingProject;
	config: GamificationConfig;
}) {
	const rankingEnabled = config.enabled && config.rankingEnabled;
	const theme = parseEventTheme({
		theme: (project as { theme?: unknown }).theme,
		primaryColor: project.primaryColor,
		secondaryColor: project.secondaryColor,
	});

	return (
		<EventContainer.Holder>
			<EventContainer.Hero
				coverUrl={project.coverUrl}
				showImage={theme.hero.image}
			>
				<div className="z-10 flex flex-1 flex-col items-start justify-center">
					<EventContainer.Hero.Meta>
						<Trophy className="mr-2 h-4.5 w-4.5" />
						<span className="-mt-0.5 text-base">
							Ranking do evento
						</span>
					</EventContainer.Hero.Meta>
					<EventContainer.Hero.Title>
						Ranking
					</EventContainer.Hero.Title>
					<EventContainer.Hero.Description>
						Quem mais participou de {project.name}. Pontos por
						check-in, presença em atividades e inscrições.
					</EventContainer.Hero.Description>
				</div>
			</EventContainer.Hero>

			<EventContainer.Content className="container-p">
				{rankingEnabled ? (
					<RankingContent eventUrl={eventUrl} />
				) : (
					<div className="flex max-w-md flex-col items-center gap-3 py-10 text-center">
						<Trophy className="text-muted-foreground size-10" />
						<p className="text-foreground font-semibold">
							Ranking desativado
						</p>
						<p className="text-muted-foreground text-sm">
							O organizador não está exibindo o ranking deste
							evento.
						</p>
					</div>
				)}
			</EventContainer.Content>

			{rankingEnabled && config.ranking.allowOptOut && (
				<p className="text-muted-foreground container-p mx-auto -mt-8 pb-8 text-center text-xs">
					Prefere não aparecer? Você pode desativar sua participação
					no ranking em “Editar perfil”.
				</p>
			)}
		</EventContainer.Holder>
	);
}

export default function EventRankingPage({ params }: Props) {
	return (
		<Suspense fallback={<RankingPageSkeleton />}>
			<RankingLoader params={params} />
		</Suspense>
	);
}

async function RankingLoader({ params }: Props) {
	const { eventUrl } = await params;
	const result = await getProject(eventUrl);

	if (!result?.project) {
		notFound();
	}

	const { project } = result;
	const config = parseGamificationConfig(project.gamification);

	if (!project.profilesEnabled || !config.enabled || !config.rankingEnabled) {
		notFound();
	}

	return (
		<RankingBody eventUrl={eventUrl} project={project} config={config} />
	);
}
