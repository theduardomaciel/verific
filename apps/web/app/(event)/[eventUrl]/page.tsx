import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { env } from "@verific/env";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Icons
import {
	Calendar,
	MapPin,
	Share2,
	Mail,
	Flag,
	Check,
	TicketCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Components
import * as EventContainer from "@/components/landing/event-container";
import { ShareDialog } from "@/components/dialogs/share-dialog";
import { ReportEventDialog } from "@/components/dialogs/report-event-dialog";

// Utils
import { isAfterEnd } from "@/lib/date";
import { getProject, getProjects } from "@/lib/data";

const markdownComponents = {
	img: ({ src, alt, ...props }: any) => (
		<Image
			src={src || ""}
			alt={alt || ""}
			width={800}
			height={600}
			className="rounded-lg"
			{...props}
		/>
	),
};

export const revalidate = 3600; // Revalidate every hour

export async function generateStaticParams() {
	const projects = await getProjects();

	return projects.map((project) => ({
		eventUrl: project.url,
	}));
}

export default async function EventPage({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}) {
	const { eventUrl } = await params;

	const { project: event, isParticipant } = await getProject(eventUrl);

	if (!event) {
		notFound();
	}

	const afterEnd = isAfterEnd(event.endDate);

	const isArchived = event.isArchived;
	const isRegistrationEnabled = event.isRegistrationEnabled;

	let disabled = false;
	let buttonText = "";
	let href = `/${eventUrl}/schedule`;

	if (isParticipant) {
		buttonText = "Ver programação";
		disabled = isArchived || afterEnd;
	} else {
		href = `/${eventUrl}/subscribe`;
		if (isArchived) {
			buttonText = "Evento arquivado";
			disabled = true;
		} else if (afterEnd) {
			buttonText = "Evento encerrado";
			disabled = true;
		} else if (!isRegistrationEnabled) {
			buttonText = "Inscrições fechadas";
			disabled = true;
		} else {
			buttonText = "Inscrever-se";
			disabled = false;
		}
	}

	return (
		<EventContainer.Holder>
			<EventContainer.Hero
				coverUrl={event.coverUrl || "/images/hero-bg.png"}
			>
				<div className="z-10 flex flex-1 flex-col items-start justify-center">
					<h1 className="mb-4 text-5xl font-bold text-white">
						{event.name}
					</h1>
					<div className="mb-6 flex items-center text-lg text-white/90">
						<Calendar className="mr-2 h-4.5 w-4.5" />
						<span className="-mt-0.5 text-base">
							De {event.startDate.toLocaleDateString("pt-BR")} a{" "}
							{event.endDate.toLocaleDateString("pt-BR")}
						</span>
					</div>
					<div className="mb-8 flex flex-wrap gap-3">
						<Badge
							variant={"secondary"}
							className="text-primary rounded-xl bg-white px-4 py-1.5"
						>
							<Check className="mr-2 !h-4 !w-4" />
							<span>Aberto para o público externo</span>
						</Badge>
						<Badge
							variant={"secondary"}
							className="text-primary rounded-xl bg-white px-4 py-1.5"
						>
							<TicketCheck className="mr-2 !h-4 !w-4" />
							<span>Emite certificado</span>
						</Badge>
					</div>
					<Button
						asChild={!disabled}
						size={"lg"}
						variant={"secondary"}
						disabled={disabled}
						className="px-12 py-6 text-base font-semibold text-white uppercase max-md:w-full"
					>
						{disabled ? (
							buttonText
						) : (
							<Link href={href}>{buttonText}</Link>
						)}
					</Button>
				</div>
				<div className="relative z-20 flex items-center justify-center">
					<Image
						src={event.thumbnailUrl || "/images/cover.png"}
						alt="SECOMP24"
						width={400}
						height={240}
						className="border-primary max-w-md overflow-hidden rounded-3xl border-2"
					/>
					<ShareDialog
						url={`${env.NEXT_PUBLIC_VERCEL_URL}/${event.url}`}
						title={event.name}
						description={
							"Use o QR code ou copie o link para compartilhar o evento!"
						}
					>
						<Button className="absolute -bottom-4 left-1/2 h-10 -translate-x-1/2 !px-6">
							<Share2 className="h-5 w-5" />
							<span>Compartilhar</span>
						</Button>
					</ShareDialog>
				</div>
			</EventContainer.Hero>

			<EventContainer.Content>
				<div className="container-p relative mx-auto flex flex-col gap-16 lg:flex-row">
					<div className="lg:w-2/3">
						<h2 className="mb-6 text-2xl font-bold">
							Descrição do Evento
						</h2>
						<div className="space-y-6">
							<div className="prose prose-lg dark:prose-invert max-w-none">
								<ReactMarkdown
									remarkPlugins={[remarkGfm]}
									components={markdownComponents}
								>
									{event.description || ""}
								</ReactMarkdown>
							</div>
						</div>
					</div>
					<div className="sticky top-16 right-0 lg:w-1/3">
						<div className="mb-6 rounded-lg border p-6">
							<h3 className="mb-4 text-xl font-medium">Local</h3>
							<p className="mb-4">{event.address}</p>
							{event.latitude && event.longitude && (
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
										src={`https://www.google.com/maps?q=${event.latitude},${event.longitude}&z=15&output=embed`}
									/>
								</div>
							)}
							<Button
								asChild
								variant="outline"
								className="flex w-full items-center justify-center gap-2"
							>
								<a
									href={`https://www.google.com/maps/search/${encodeURIComponent(event.address)}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									<MapPin className="h-4 w-4" />
									<span>Ver no mapa</span>
								</a>
							</Button>
						</div>
						<div className="flex flex-col rounded-lg border p-6">
							<h3 className="mb-4 text-xl font-medium">
								Sobre o produtor
							</h3>
							<p className="mb-4">{event.owner.name}</p>
							<Button
								asChild
								variant="outline"
								className="flex w-full items-center justify-center gap-2"
							>
								<a href={`mailto:${event.owner.public_email}`}>
									<Mail className="h-4 w-4" />
									<span>Falar com o produtor</span>
								</a>
							</Button>
						</div>
						<span className="flex w-full items-end justify-end">
							<ReportEventDialog eventId={event.id}>
								<Button
									variant={"outline"}
									size={"lg"}
									className="mt-4 max-lg:w-full"
								>
									<Flag className="mr-2 h-4 w-4" />
									<span>Denunciar este evento</span>
								</Button>
							</ReportEventDialog>
						</span>
					</div>
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
