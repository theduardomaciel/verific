import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { env } from "@verific/env";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Icons
import {
	Calendar,
	MapPin,
	Share2,
	Mail,
	Check,
	TicketCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventAction } from "@/components/event-action";
import { Skeleton } from "@/components/ui/skeleton";
import { EVENT_BADGE_COLORS } from "@/components/landing/event-nav";
import { cn } from "@/lib/utils";
import { parseEventTheme } from "@verific/drizzle/theme";

// Components
import * as EventContainer from "@/components/landing/event-container";
import { ShareDialog } from "@/components/dialogs/share-dialog";
import { ReportEventDialog } from "@/components/dialogs/report-event-dialog";
import { EventPageSkeleton } from "./skeleton";

import { getEventStaticParams, getProject } from "@/lib/data";

/**
 * `next/image` exige `src`/`width`/`height` próprios, então a imagem do
 * markdown é reconstruída em vez de repassada: as props do `react-markdown`
 * (`node`, `title`, …) não são válidas no `Image`.
 */
const markdownComponents: Components = {
	img: ({ src, alt }) => (
		<Image
			src={typeof src === "string" ? src : ""}
			alt={alt ?? ""}
			width={800}
			height={600}
			className="rounded-lg"
		/>
	),
};

export async function generateStaticParams() {
	return getEventStaticParams();
}

type EventPageProject = NonNullable<
	Awaited<ReturnType<typeof getProject>>
>["project"];

function EventPageBody({ project }: { project: EventPageProject }) {
	const eventUrl = project.url;
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
					<EventContainer.Hero.Title>
						{project.name}
					</EventContainer.Hero.Title>
					<EventContainer.Hero.Meta className="mb-6">
						<Calendar className="mr-2 h-4.5 w-4.5" />
						<span className="-mt-0.5 text-base">
							<EventContainer.EventDateRange
								startDate={project.startDate}
								endDate={project.endDate}
							/>
						</span>
					</EventContainer.Hero.Meta>
					<div className="mb-8 flex flex-wrap gap-3">
						<Badge
							variant={"secondary"}
							className={cn(
								"rounded-xl px-4 py-3.5 text-sm leading-none font-semibold sm:[&>svg]:size-4!",
								EVENT_BADGE_COLORS,
							)}
						>
							<Check className="mr-2" />
							<span>Aberto para o público externo</span>
						</Badge>
						<Badge
							variant={"secondary"}
							className={cn(
								"rounded-xl px-4 py-3.5 text-sm leading-none font-semibold sm:[&>svg]:size-4!",
								EVENT_BADGE_COLORS,
							)}
						>
							<TicketCheck className="mr-2" />
							<span>Emite certificado</span>
						</Badge>
					</div>
					<Suspense fallback={<Skeleton className="h-12 w-44" />}>
						<EventAction eventUrl={eventUrl} />
					</Suspense>
				</div>
				<div className="relative z-20 flex h-60 items-center justify-center">
					<Image
						src={project.thumbnailUrl || "/images/cover.png"}
						alt={`Imagem de divulgação de ${project.name}`}
						width={400}
						height={240}
						sizes="(max-width: 768px) 100vw, 400px"
						className="border-primary max-w-md overflow-hidden rounded-3xl border-2"
					/>
					<ShareDialog
						url={`${env.NEXT_PUBLIC_VERCEL_URL}/${project.url}`}
						title={project.name}
						description={
							"Use o QR code ou copie o link para compartilhar o evento!"
						}
					>
						<Button className="absolute -bottom-4 left-1/2 h-10 -translate-x-1/2 px-6!">
							<Share2 className="h-5 w-5" />
							<span>Compartilhar</span>
						</Button>
					</ShareDialog>
				</div>
			</EventContainer.Hero>

			<EventContainer.Content>
				<div className="container-p relative mx-auto flex flex-col gap-16 lg:flex-row">
					<div className="lg:w-2/3">
						<h2 className="font-heading mb-6 text-2xl font-bold">
							Descrição do Evento
						</h2>
						<div className="space-y-6">
							<div className="prose prose-lg dark:prose-invert max-w-none">
								<ReactMarkdown
									remarkPlugins={[remarkGfm]}
									components={markdownComponents}
								>
									{project.description || ""}
								</ReactMarkdown>
							</div>
						</div>
					</div>
					<div className="sticky top-16 right-0 lg:w-1/3">
						<div className="mb-6 rounded-(--ev-card-radius,1.5rem) border p-6">
							<h3 className="font-heading mb-4 text-xl font-medium">
								Local
							</h3>
							<p className="mb-4">{project.address}</p>
							{project.latitude && project.longitude && (
								<div className="mb-4 overflow-hidden rounded-lg border">
									<iframe
										title="Mapa do local"
										width={400}
										height={200}
										style={{
											border: 0,
											width: "100%",
											borderRadius: "0.5rem",
										}}
										loading="lazy"
										allowFullScreen
										referrerPolicy="no-referrer-when-downgrade"
										src={`https://www.google.com/maps?q=${project.latitude},${project.longitude}&z=15&output=embed`}
									/>
								</div>
							)}
							<Button
								asChild
								variant="outline"
								className="flex w-full items-center justify-center gap-2"
							>
								<a
									href={`https://www.google.com/maps/search/${encodeURIComponent(project.address)}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									<MapPin className="h-4 w-4" />
									<span>Ver no mapa</span>
								</a>
							</Button>
						</div>
						<div className="flex flex-col rounded-(--ev-card-radius,1.5rem) border p-6">
							<h3 className="font-heading mb-4 text-xl font-medium">
								Sobre o produtor
							</h3>
							<p className="mb-4">{project.owner.name}</p>
							<Button
								asChild
								variant="outline"
								className="flex w-full items-center justify-center gap-2"
							>
								<a href={`mailto:${project.owner.publicEmail}`}>
									<Mail className="h-4 w-4" />
									<span>Falar com o produtor</span>
								</a>
							</Button>
						</div>
						<span className="flex w-full items-end justify-end">
							<ReportEventDialog />
						</span>
					</div>
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}

/**
 * Gate antes de qualquer `<Suspense>`: evento desconhecido responde
 * 404 real. (O gate do layout já cobre isso; este `notFound` fica como
 * rede de segurança + narrowing de tipos.)
 */
export default async function EventPage({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}) {
	const { eventUrl } = await params;
	const result = await getProject(eventUrl);

	if (!result?.project) {
		notFound();
	}

	return (
		<Suspense fallback={<EventPageSkeleton />}>
			<EventPageBody project={result.project} />
		</Suspense>
	);
}
