"use client";

import { cn } from "@/lib/utils";
import { User } from "lucide-react";

// Components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

// Types
import { RouterOutput } from "@verific/api";

interface Props {
	speakers: NonNullable<
		RouterOutput["getActivities"]["activities"][number]["speakers"]
	>;
}

export function ActivityCardSpeakers({ speakers }: Props) {
	if (!speakers || speakers.length === 0) {
		return null;
	}

	return speakers.length > 1 ? (
		<Carousel
			className="w-full"
			plugins={[Autoplay({ delay: 2000 })]}
			showDots
			opts={{
				loop: true,
			}}
		>
			<CarouselContent className="-ml-2 md:-ml-4">
				{speakers.map((speaker) => (
					<CarouselItem
						key={speaker.id}
						className="basis-full pl-2 md:pl-4"
					>
						<SpeakerCard speaker={speaker} />
					</CarouselItem>
				))}
			</CarouselContent>
		</Carousel>
	) : (
		<SpeakerCard speaker={speakers[0]!} />
	);
}

function SpeakerCard({ speaker }: { speaker: Props["speakers"][number] }) {
	return (
		<div
			className={cn(
				"mb-4 flex items-center gap-6 rounded-lg border px-6 py-4",
			)}
		>
			<Avatar className={cn("aspect-square h-10 w-10 object-cover")}>
				<AvatarImage src={speaker.imageUrl || undefined} />
				<AvatarFallback className="cursor-default">
					<User className={cn("h-6 w-6 text-white")} />
				</AvatarFallback>
			</Avatar>
			<div className="flex flex-col items-start justify-start gap-0.5">
				<p className="font-bold">{speaker.name}</p>
				<p className="text-muted-foreground text-sm font-medium">
					{speaker.description || "Palestrante"}
				</p>
			</div>
		</div>
	);
}
