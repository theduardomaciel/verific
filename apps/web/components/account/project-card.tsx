"use client";

// Icons
import { ArrowRight, Ticket } from "lucide-react";

// Components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Actions
import { updateProjectCookies } from "@/app/actions";

// Types
import { RouterOutput } from "@verific/api";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface EventCardProps {
	project: RouterOutput["getProjects"]["owned"][0];
}

export function AccountEventCard({ project }: EventCardProps) {
	return (
		<button
			type="button"
			onClick={() =>
				updateProjectCookies(
					project.id,
					project.url,
					project.startDate.toISOString(),
				)
			}
			className="bg-card hover:bg-foreground/5 relative flex w-full cursor-pointer items-center justify-between rounded-lg p-4 transition-colors"
		>
			{project.thumbnailUrl && (
				<Image src={project.thumbnailUrl} alt="" fill />
			)}
			<div className="flex items-center gap-6">
				<Avatar
					className={cn(
						"bg-border flex h-11 w-11 items-center justify-center rounded-md px-4",
						{
							"w-24": project.largeLogoUrl,
						},
					)}
				>
					<AvatarImage
						className="object-contain"
						src={
							project.largeLogoUrl || project.logoUrl || undefined
						}
						alt={project.name}
					/>
					<AvatarFallback>
						<Ticket className="text-foreground h-5 w-5" />
					</AvatarFallback>
				</Avatar>
				<div className="flex flex-col items-start gap-0.5">
					<h3 className="text-foreground font-semibold">
						{project.name}
					</h3>
					<p className="text-foreground text-sm">
						Criado em{" "}
						{project.createdAt.toLocaleDateString("pt-BR", {
							day: "2-digit",
							month: "2-digit",
							year: "numeric",
						})}
					</p>
				</div>
			</div>
			<ArrowRight className="text-foreground h-5 w-5" />
		</button>
	);
}
