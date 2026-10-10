"use client";

import Autoplay from "embla-carousel-autoplay";
import { Info, User } from "lucide-react";

// Types
import type { RouterOutput } from "@verific/api";

// Components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
} from "@/components/ui/carousel";

import { SpeakerDetailsDialog } from "@/components/activity-join/speaker-details-dialog";

import { cn } from "@/lib/utils";

interface Props {
	className?: string;
	speakers: NonNullable<
		RouterOutput["getActivities"]["activities"][number]["speakers"]
	>;
	/** Event URL slug. Enables the "full profile" link for linked speakers. */
	projectUrl?: string;
}

export function ActivitySpeakers({ className, speakers, projectUrl }: Props) {
	if (!speakers || speakers.length === 0) {
		return null;
	}

	return speakers.length > 1 ? (
		<Carousel
			className={cn("grid w-full grid-cols-1", className)}
			plugins={[Autoplay({ delay: 4000 })]}
			slideCount={speakers.length}
			opts={{
				loop: true,
			}}
			showDots
		>
			<div className="flex flex-col rounded-lg border">
				<CarouselContent className="-ml-2 md:-ml-4">
					{speakers.map((speaker) => (
						<CarouselItem
							key={speaker.id}
							className="basis-full pl-2 md:pl-4"
						>
							<SpeakerCard
								speaker={speaker}
								projectUrl={projectUrl}
							/>
						</CarouselItem>
					))}
				</CarouselContent>
			</div>
		</Carousel>
	) : (
		<SpeakerCard
			speaker={speakers[0]!}
			showBorder
			projectUrl={projectUrl}
		/>
	);
}

function SpeakerCard({
	speaker,
	showBorder = false,
	projectUrl,
}: {
	speaker: Props["speakers"][number];
	showBorder?: boolean;
	projectUrl?: string;
}) {
	return (
		<SpeakerDetailsDialog
			speaker={speaker}
			projectUrl={projectUrl}
			trigger={
				<button
					type="button"
					title={`Ver detalhes de ${speaker.name}`}
					aria-label={`Ver detalhes de ${speaker.name}`}
					className={cn(
						"flex w-full cursor-pointer items-center gap-6 px-6 py-4 text-left transition-colors",
						"hover:bg-muted/50 focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-[3px]",
						{
							"rounded-lg border": showBorder,
						},
					)}
				>
					<Avatar
						className={cn("aspect-square h-10 w-10 object-cover")}
					>
						<AvatarImage src={speaker.imageUrl || undefined} />
						<AvatarFallback className="bg-primary cursor-default">
							<User className={cn("h-6 w-6 text-white")} />
						</AvatarFallback>
					</Avatar>
					<div className="flex min-w-0 flex-1 flex-col items-start justify-start gap-0.5">
						<p className="font-bold">{speaker.name}</p>
						<p className="text-muted-foreground line-clamp-2 text-sm font-medium">
							{speaker.title ||
								speaker.description ||
								"Palestrante"}
						</p>
					</div>
					<Info
						className="text-muted-foreground hover:text-foreground ml-auto h-5 w-5 shrink-0 transition-colors"
						aria-hidden
					/>
				</button>
			}
		/>
	);
}
