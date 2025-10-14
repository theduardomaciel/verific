"use client";

// Icons
import { ArrowRight, User } from "lucide-react";

// Components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Actions
import { updateProjectCookies } from "@/app/actions";

// Types
import { RouterOutput } from "@verific/api";
import Image from "next/image";

interface EventCardProps {
	project: RouterOutput["getProjects"][number];
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
				<Avatar className="bg-border flex h-11 w-11 items-center justify-center rounded-full">
					<AvatarImage
						src={project.logoUrl || undefined}
						alt={project.name}
					/>
					<AvatarFallback>
						<User className="h-5 w-5 text-slate-300" />
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
