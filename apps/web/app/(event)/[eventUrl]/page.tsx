import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

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

// Icons
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// API
import { serverClient } from "@/lib/trpc/server";

import * as EventContainer from "@/components/landing/event-container";

export default async function EventPage({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}) {
	const { eventUrl } = await params;

	const { project: event, isParticipant } = await serverClient.getProject({
		url: eventUrl,
	});

	if (!event) {
		notFound();
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
							De {event.startDate.toLocaleDateString()} a{" "}
							{event.endDate.toLocaleDateString()}
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
					<Button asChild size={"lg"} variant={"secondary"}>
						<Link
							href={`/${eventUrl}/${isParticipant ? "schedule" : "subscribe"}`}
							className="h-fit !px-12 py-3 text-base font-semibold text-white uppercase max-md:w-full"
						>
							{isParticipant ? "Ver programação" : "Inscrever-se"}
						</Link>
					</Button>
				</div>
				<div className="relative z-20 flex items-center justify-center">
					<Image
						src="/images/cover.png"
						alt="SECOMP24"
						width={400}
						height={240}
						className="border-primary max-w-md overflow-hidden rounded-3xl border-2"
					/>
					<Button className="absolute -bottom-4 left-1/2 h-10 -translate-x-1/2 !px-6">
						<Share2 className="h-5 w-5" />
						<span>Compartilhar</span>
					</Button>
				</div>
			</EventContainer.Hero>

			<EventContainer.Content>
				<div className="container-p relative mx-auto flex flex-col gap-16 lg:flex-row">
					<div className="lg:w-2/3">
						<h2 className="mb-6 text-2xl font-bold">
							Descrição do Evento
						</h2>
						<div className="space-y-6">
							<p>{event.description}</p>
						</div>
					</div>
					<div className="sticky top-16 right-0 lg:w-1/3">
						<div className="mb-6 rounded-lg border p-6">
							<h3 className="mb-4 text-xl font-medium">Local</h3>
							<p className="mb-4">{event.address}</p>
							<Button
								variant="outline"
								className="flex w-full items-center justify-center gap-2"
							>
								<MapPin className="h-4 w-4" />
								<span>Ver no mapa</span>
							</Button>
						</div>
						<div className="flex flex-col rounded-lg border p-6">
							<h3 className="mb-4 text-xl font-medium">
								Sobre o produtor
							</h3>
							<p className="mb-4">{event.owner.name}</p>
							<Button
								variant="outline"
								className="flex w-full items-center justify-center gap-2"
							>
								<Mail className="h-4 w-4" />
								<span>Falar com o produtor</span>
							</Button>
						</div>
						<span className="flex w-full items-end justify-end">
							<Button
								variant={"outline"}
								size={"lg"}
								className="mt-4 max-lg:w-full"
							>
								<Flag className="mr-2 h-4 w-4" />
								<span>Denunciar esse evento</span>
							</Button>
						</span>
					</div>
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
