import Image from "next/image";

// Icons
import { ArrowRight, Calendar, Clock, Users, BookOpen } from "lucide-react";

// Components
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

// Types
import { RouterOutput } from "@verific/api";

// Lib
import { getDateString, getTimeString } from "../../lib/date";

interface EventCardProps {
	activity: RouterOutput["getActivities"]["activities"][number];
	isWide?: boolean;
}

export function ActivityCard({ activity }: EventCardProps) {
	const remainingSeats = activity.participantsLimit
		? activity.participantsLimit - activity.participants.length
		: 0;
	const availableSpots =
		remainingSeats > 0 ? `${remainingSeats} vagas` : "Vagas esgotadas";

	const displayDate = getDateString(activity);
	const displayTime = getTimeString(activity.dateFrom);

	return (
		<div
			id={activity.id}
			className={`bg-card flex h-full flex-col justify-between rounded-lg border p-6`}
		>
			<div>
				<div className="mb-2 flex items-start justify-between">
					<span className="text-sm font-extrabold uppercase">
						{activity.category}
					</span>
					{activity.participantsLimit && (
						<span className="text-muted-foreground text-xs">
							{availableSpots}
						</span>
					)}
				</div>
				<h3 className="mb-2 text-lg font-bold">{activity.name}</h3>
				<p className="text-muted-foreground mb-4 text-sm">
					{activity.description}
				</p>

				{activity.speaker && (
					<div className="mb-4 flex items-center gap-3 rounded-lg border px-6 py-3">
						<div className="h-10 w-10 min-w-10 overflow-hidden rounded-full bg-gray-200">
							<Image
								src="/placeholder.svg?height=40&width=40" // TODO: Substituir por imagem real do palestrante
								alt={activity.speaker.name}
								width={40}
								height={40}
								className="min-w-10 object-cover"
							/>
						</div>
						<div>
							<p className="text-sm font-medium">
								{activity.speaker.name}
							</p>
							<p className="text-muted-foreground text-xs">
								{activity.speaker.description}
							</p>
						</div>
					</div>
				)}

				<div className="mb-4 flex flex-wrap gap-2">
					<Badge className="bg-muted text-foreground py-1">
						<Calendar className="mr-2 !h-3.5 !w-3.5" />
						<span className="-mt-0.5 text-sm">{displayDate}</span>
					</Badge>
					<Badge className="bg-muted text-foreground py-1">
						<Clock className="mr-2 !h-3.5 !w-3.5" />
						<span className="-mt-0.5 text-sm">{displayTime}</span>
					</Badge>
					{activity.workload && (
						<Badge className="bg-muted text-foreground py-1">
							<BookOpen className="mr-2 !h-3.5 !w-3.5" />
							<span className="-mt-0.5 text-sm">
								{activity.workload}h
							</span>
						</Badge>
					)}
					<Badge className="bg-muted text-foreground py-1">
						<Users className="mr-2 !h-3.5 !w-3.5" />
						<span className="-mt-0.5 text-sm capitalize">
							{activity.audience === "internal"
								? "Interno"
								: "Externo"}
						</span>
					</Badge>
				</div>
			</div>

			<div className="mt-auto">
				<Button variant={"default"} size={"lg"} className="w-full">
					Quero participar
					<ArrowRight className="ml-2 h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
