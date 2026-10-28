import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { Trophy } from "lucide-react";

import type { RouterOutput } from "@verific/api";
import {
	parseGamificationConfig,
	type GamificationConfig,
} from "@verific/drizzle/gamification";
import { parseEventTheme } from "@verific/drizzle/theme";

import { RankingContent } from "@/components/gamification/ranking-content";
import * as EventContainer from "@/components/landing/event-container";

import { getCachedEventRanking, getProject } from "@/lib/data";
import { isProfileNotFoundError } from "@/lib/profile-page-data";
import { serverClient } from "@/lib/trpc/server";

import { RankingPageSkeleton } from "./skeleton";

type Props = Pick<PageProps<"/[eventUrl]/ranking">, "params">;

type RankingProject = NonNullable<
	Awaited<ReturnType<typeof getProject>>
>["project"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { eventUrl } = await params;
	const result = await getProject(eventUrl);
	if (!result?.project) return { title: "Ranking" };

	const config = parseGamificationConfig(result.project.gamification);

	return {
		title: "Ranking",
		description: `Veja os participantes que mais se engajaram em ${result.project.name}.`,
		// Ranking privado não deve ser indexado (nem aparecer em buscas).
		robots: config.ranking.isPublic
			? undefined
			: { index: false, follow: false },
	};
}

function RankingBody({
	eventUrl,
	project,
	config,
	initialData,
}: {
	eventUrl: string;
	project: RankingProject;
	config: GamificationConfig;
	initialData: RouterOutput["getEventRanking"];
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
				<RankingContent eventUrl={eventUrl} initialData={initialData} />
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

	// Ranking público: valor do Data Cache (página estática, sem polling).
	// Ranking privado: só dono/moderador — a leitura passa pela sessão e o
	// procedimento responde NOT_FOUND para os demais.
	let initialData: RouterOutput["getEventRanking"] | null = null;
	try {
		if (config.ranking.isPublic) {
			initialData = await getCachedEventRanking(eventUrl);
		} else {
			await connection();
			initialData = await serverClient.getEventRanking({
				projectUrl: eventUrl,
			});
		}
	} catch (error) {
		// Só NOT_FOUND vira 404; falha transitória de banco não pode ser
		// gravada no cache da rota.
		if (!isProfileNotFoundError(error)) throw error;
	}

	if (!initialData) {
		notFound();
	}

	return (
		<RankingBody
			eventUrl={eventUrl}
			project={project}
			config={config}
			initialData={initialData}
		/>
	);
}
