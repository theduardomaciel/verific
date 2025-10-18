"use client";

import { cn } from "@/lib/utils";
import { User } from "lucide-react";

// Components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Carousel,
	CarouselContent,
	CarouselDots,
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

export function ActivitySpeakers({ speakers }: Props) {
	if (!speakers || speakers.length === 0) {
		return null;
	}

	return speakers.length > 1 ? (
		<Carousel
			className="w-full"
			plugins={[Autoplay({ delay: 5000 })]}
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
							<SpeakerCard speaker={speaker} />
						</CarouselItem>
					))}
				</CarouselContent>
			</div>
		</Carousel>
	) : (
		<SpeakerCard speaker={speakers[0]!} showBorder />
	);
}

function SpeakerCard({
	speaker,
	showBorder = false,
}: {
	speaker: Props["speakers"][number];
	showBorder?: boolean;
}) {
	return (
		<div
			className={cn("flex items-center gap-6 px-6 py-4", {
				"rounded-lg border": showBorder,
			})}
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
