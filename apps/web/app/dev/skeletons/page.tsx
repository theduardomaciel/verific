import { notFound } from "next/navigation";

import { EventPageSkeleton } from "@/app/(event)/[eventUrl]/skeleton";
import { SchedulePageSkeleton } from "@/app/(event)/[eventUrl]/schedule/skeleton";
import { SubscribePageSkeleton } from "@/app/(event)/[eventUrl]/subscribe/skeleton";
import { ProfilePageSkeleton } from "@/app/(event)/[eventUrl]/profile/[shortId]/skeleton";
import { ScheduleLoading } from "@/app/(event)/[eventUrl]/schedule/content-skeleton";

/**
 * DEV-ONLY: renders every event-route skeleton at rest, so sizes can be
 * compared against the loaded pages without racing the stream.
 * Unavailable in production.
 */
export default function SkeletonsPreviewPage() {
	if (process.env.NODE_ENV === "production") {
		notFound();
	}

	const cases = [
		{ title: "Landing — EventPageSkeleton", node: <EventPageSkeleton /> },
		{
			title: "Schedule — SchedulePageSkeleton",
			node: <SchedulePageSkeleton />,
		},
		{
			title: "Schedule (conteúdo) — ScheduleLoading",
			node: <ScheduleLoading />,
		},
		{
			title: "Subscribe — SubscribePageSkeleton",
			node: <SubscribePageSkeleton />,
		},
		{
			title: "Profile — ProfilePageSkeleton",
			node: <ProfilePageSkeleton />,
		},
	];

	return (
		<main className="flex min-h-screen flex-col">
			<header className="border-b p-4">
				<h1 className="text-xl font-bold">
					Skeletons (somente desenvolvimento)
				</h1>
				<p className="text-muted-foreground text-sm">
					Compare cada bloco com a página carregada lado a lado (duas
					janelas ou screenshot sobreposta). Alturas-alvo: hero py-24
					· título text-5xl h-12 (uma linha) / h-24 (duas linhas) ·
					banner h-96 (com bio) · tickets min-h-64.
				</p>
			</header>
			{cases.map(({ title, node }) => (
				<section key={title} className="border-b">
					<h2 className="bg-muted px-4 py-2 font-mono text-sm">
						{title}
					</h2>
					{node}
				</section>
			))}
		</main>
	);
}
