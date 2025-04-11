import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import Link from "next/link";

interface ActivityCardProps {
	title: string;
	speaker: string;
	type: string;
	time: "AGORA" | "EM BREVE" | string;
}

export function ActivityCard({
	title,
	speaker,
	type,
	time,
}: ActivityCardProps) {
	return (
		<Link
			className="flex hover:bg-foreground/5 flex-col items-start justify-start space-y-2 rounded-md border border-foreground p-4"
			href="#"
		>
			<div className="flex flex-col items-start justify-start text-foreground">
				<h3 className="font-semibold font-dashboard">{title}</h3>
				<span className="text-xs">{speaker}</span>
			</div>
			<div className="flex flex-row items-center justify-between w-full">
				<p className="text-sm font-extrabold line-clamp-1">{type}</p>
				{time === "AGORA" && (
					<Tag className="bg-primary text-white" type={time} />
				)}
				{time === "EM BREVE" && (
					<Tag className="bg-yellow-500 text-white" type={time} />
				)}
				{time !== "AGORA" && time !== "EM BREVE" && (
					<div className="flex items-center gap-1 text-xs text-gray-500">
						<Calendar className="h-4 w-4" />
						<span>{time}</span>
					</div>
				)}
			</div>
		</Link>
	);
}

function Tag({ className, type }: { className?: string; type: string }) {
	return (
		<div
			className={cn(
				"flex flex-row items-center justify-center gap-2 rounded-md bg-primary px-3 py-1 text-xs font-extrabold text-white",
				className,
			)}
		>
			<div className="min-w-2 min-h-2 rounded-full bg-white" />
			<span className="line-clamp-1">{type}</span>
		</div>
	);
}
