"use client";

import Link from "next/link";
import { useState } from "react";

// Icons
import { User } from "lucide-react";

// Utils
import {
	normalizeSocialLink,
	socialDisplayHandle,
	socialServiceById,
} from "@verific/drizzle/profile-layout";

// Components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

import { SocialServiceIcon } from "@/components/profile/social-icons";

export interface SpeakerDetails {
	id: number;
	name: string;
	title?: string | null;
	description?: string | null;
	imageUrl?: string | null;
	socials?: Array<{ service: string; value: string }>;
	profileShortId?: string | null;
}

interface SpeakerDetailsDialogProps {
	speaker: SpeakerDetails;
	projectUrl?: string;
	trigger: React.ReactNode;
}

/**
 * Cartão de detalhes do palestrante (v1: sem palestras, sem página
 * própria). Abre ao clicar no cartão da lista; palestrantes vinculados
 * oferecem o link para o perfil público completo.
 */
export function SpeakerDetailsDialog({
	speaker,
	projectUrl,
	trigger,
}: SpeakerDetailsDialogProps) {
	const [open, setOpen] = useState(false);

	const socials = (speaker.socials ?? []).flatMap((entry) => {
		const service = socialServiceById(entry.service);
		if (!service) return [];
		const url = normalizeSocialLink(entry.service, entry.value);
		if (!url) return [];
		return [
			{
				service: entry.service,
				label: service.label,
				url,
				display: socialDisplayHandle(url),
			},
		];
	});

	const profileHref =
		projectUrl && speaker.profileShortId
			? `/${projectUrl}/profile/${speaker.profileShortId}`
			: null;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader className="flex flex-row items-center gap-4 text-left">
					<Avatar className="h-16 w-16 shrink-0">
						<AvatarImage src={speaker.imageUrl || undefined} />
						<AvatarFallback className="bg-primary cursor-default">
							<User className="h-8 w-8 text-white" />
						</AvatarFallback>
					</Avatar>
					<div className="flex min-w-0 flex-col gap-0.5">
						<DialogTitle className="text-xl leading-tight">
							{speaker.name}
						</DialogTitle>
						{speaker.title ? (
							<p className="text-muted-foreground text-sm font-medium">
								{speaker.title}
							</p>
						) : null}
					</div>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					{speaker.description ? (
						<p className="text-sm whitespace-pre-line">
							{speaker.description}
						</p>
					) : null}
					{socials.length > 0 ? (
						<ul className="flex flex-row flex-wrap gap-2">
							{socials.map((social) => (
								<li key={`${social.service}-${social.url}`}>
									<a
										className="bg-muted hover:bg-muted/70 flex flex-row items-center gap-2 rounded-md px-2.5 py-1.5 text-sm leading-none font-medium transition-colors"
										href={social.url}
										target="_blank"
										rel="noopener noreferrer"
										title={social.label}
									>
										<SocialServiceIcon
											service={social.service}
										/>
										<span>{social.display}</span>
									</a>
								</li>
							))}
						</ul>
					) : null}
					{profileHref ? (
						<Button asChild className="w-full">
							<Link href={profileHref}>Ver perfil completo</Link>
						</Button>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}
