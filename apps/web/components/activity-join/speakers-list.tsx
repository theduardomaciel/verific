"use client";

// Icons
import { User } from "lucide-react";

// Components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { cn } from "@/lib/utils";

import {
	SpeakerDetailsDialog,
	type SpeakerDetails,
} from "./speaker-details-dialog";

interface SpeakersListProps {
	speakers: SpeakerDetails[];
	/** Event URL slug. Enables the "full profile" link for linked speakers. */
	projectUrl?: string;
	className?: string;
}

/**
 * Lista estática de palestrantes (sem carrossel/autoplay): usada na
 * página da atividade, onde há espaço horizontal de sobra e nada deve
 * se mover sozinho. O carrossel com autoplay continua só no card.
 *
 * Clicar no cartão abre os detalhes (título, bio, redes); palestrantes
 * vinculados oferecem o link para o perfil público completo.
 */
export function SpeakersList({
	speakers,
	projectUrl,
	className,
}: SpeakersListProps) {
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
				<li key={speaker.id}>
					<SpeakerDetailsDialog
						speaker={speaker}
						projectUrl={projectUrl}
						trigger={
							<button
								type="button"
								className="hover:border-primary/50 flex w-full cursor-pointer items-center gap-4 rounded-lg border p-4 text-left transition-colors"
								title={`Ver detalhes de ${speaker.name}`}
							>
								<Avatar className="aspect-square h-10 w-10 shrink-0 object-cover">
									<AvatarImage
										src={speaker.imageUrl || undefined}
									/>
									<AvatarFallback className="bg-primary cursor-default">
										<User className="h-6 w-6 text-white" />
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
							</button>
						}
					/>
				</li>
			))}
		</ul>
	);
}
