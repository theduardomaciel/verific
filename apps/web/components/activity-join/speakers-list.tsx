"use client";

// Icons
import { User } from "lucide-react";

// Types
import type { RouterOutput } from "@verific/api";

// Components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { cn } from "@/lib/utils";

type Speaker = NonNullable<
	RouterOutput["getActivities"]["activities"][number]["speakers"]
>[number];

interface SpeakersListProps {
	speakers: Speaker[];
	className?: string;
}

/**
 * Lista estática de palestrantes (sem carrossel/autoplay): usada na
 * página da atividade, onde há espaço horizontal de sobra e nada deve
 * se mover sozinho. O carrossel com autoplay continua só no card.
 */
export function SpeakersList({ speakers, className }: SpeakersListProps) {
	if (!speakers || speakers.length === 0) {
		return null;
	}

	return (
		<ul
			className={cn(
				"grid w-full grid-cols-1 gap-4 sm:grid-cols-2",
				className,
			)}
		>
			{speakers.map((speaker) => (
				<li
					key={speaker.id}
					className="flex w-full items-center gap-4 rounded-lg border p-4"
				>
					<Avatar className="aspect-square h-10 w-10 shrink-0 object-cover">
						<AvatarImage src={speaker.imageUrl || undefined} />
						<AvatarFallback className="bg-primary cursor-default">
							<User className="h-6 w-6 text-white" />
						</AvatarFallback>
					</Avatar>
					<div className="flex min-w-0 flex-col items-start justify-start gap-0.5">
						<p className="font-bold">{speaker.name}</p>
						<p className="text-muted-foreground text-sm font-medium">
							{speaker.description || "Palestrante"}
						</p>
					</div>
				</li>
			))}
		</ul>
	);
}
