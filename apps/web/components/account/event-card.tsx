// Icons
import { ArrowRight, User } from "lucide-react";

// Components
import { Avatar } from "@/components/ui/avatar";

// Types
import { RouterOutput } from "@verific/api";

interface EventCardProps {
	project: RouterOutput["getProjects"][number];
}

export function EventCard({ project }: EventCardProps) {
	const { name, createdAt } = project;

	return (
		<div className="bg-card hover:bg-foreground/5 flex cursor-pointer items-center justify-between rounded-lg p-4 transition-colors">
			<div className="flex items-center">
				<Avatar className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
					<User className="h-5 w-5 text-slate-300" />
				</Avatar>
				<div>
					<h3 className="text-foreground font-medium">{name}</h3>
					<p className="text-foreground text-sm">
						Criado em{" "}
						{createdAt.toLocaleDateString("pt-BR", {
							day: "2-digit",
							month: "2-digit",
							year: "numeric",
						})}
					</p>
				</div>
			</div>
			<ArrowRight className="text-foreground h-5 w-5" />
		</div>
	);
}
