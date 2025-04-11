import { Avatar } from "@/components/ui/avatar";
import { ArrowRight, User } from "lucide-react";

interface EventCardProps {
	name: string;
	createdAt: string;
}

export function EventCard({ name, createdAt }: EventCardProps) {
	return (
		<div className="bg-card rounded-lg p-4 flex items-center justify-between hover:bg-foreground/5 transition-colors cursor-pointer">
			<div className="flex items-center">
				<Avatar className="h-10 w-10 mr-4 flex items-center justify-center bg-slate-800 rounded-full">
					<User className="h-5 w-5 text-slate-300" />
				</Avatar>
				<div>
					<h3 className="text-foreground font-medium">{name}</h3>
					<p className="text-sm text-foreground">Criado em {createdAt}</p>
				</div>
			</div>
			<ArrowRight className="h-5 w-5 text-foreground" />
		</div>
	);
}
