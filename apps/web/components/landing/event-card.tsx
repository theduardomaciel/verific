import Image from "next/image";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

interface EventCardProps {
	type: string;
	title: string;
	description: string;
	presenterName?: string;
	presenterDesc?: string;
	availableSpots?: string;
	status?: string;
	date: string;
	time: string;
	buttonColor: string;
	buttonHoverColor: string;
	isWide?: boolean;
}

export function EventCard({
	type,
	title,
	description,
	presenterName,
	presenterDesc,
	availableSpots,
	status,
	date,
	time,
	buttonColor,
	buttonHoverColor,
}: EventCardProps) {
	return (
		<div className={`bg-card rounded-lg border p-6`}>
			<div className="mb-2 flex items-start justify-between">
				<span className="text-sm font-extrabold uppercase">{type}</span>
				{availableSpots && (
					<span className="text-muted-foreground text-xs">
						{availableSpots}
					</span>
				)}
				{status && (
					<span className="text-destructive text-xs font-semibold">
						{status}
					</span>
				)}
			</div>
			<h3 className="mb-2 text-lg font-bold">{title}</h3>
			<p className="text-muted-foreground mb-4 text-sm">{description}</p>

			{presenterName && (
				<div className="mb-4 flex items-center gap-3 rounded-lg border px-6 py-3">
					<div className="h-10 w-10 min-w-10 overflow-hidden rounded-full bg-gray-200">
						<Image
							src="/placeholder.svg?height=40&width=40"
							alt={presenterName}
							width={40}
							height={40}
							className="min-w-10 object-cover"
						/>
					</div>
					<div>
						<p className="text-sm font-medium">{presenterName}</p>
						<p className="text-muted-foreground text-xs">
							{presenterDesc}
						</p>
					</div>
				</div>
			)}

			<div className="mt-4 flex items-center justify-between">
				<Button variant={"default"} size={"lg"}>
					Quero participar
					<ArrowRight className="h-4 w-4" />
				</Button>

				<div className="flex items-center gap-4">
					<Badge className="bg-muted text-foreground py-1">
						<Calendar className="mr-2 !h-3.5 !w-3.5" />
						<span className="-mt-0.5 text-sm">{date}</span>
					</Badge>
					<Badge className="bg-muted text-foreground py-1">
						<Clock className="mr-2 !h-3.5 !w-3.5" />
						<span className="-mt-0.5 text-sm">{time}</span>
					</Badge>
				</div>
			</div>
		</div>
	);
}
