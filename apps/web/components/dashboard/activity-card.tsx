import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

// Icons
import { Calendar, Clock, Timer, User, Users } from "lucide-react";

// Components
import { Badge } from "@/components/ui/badge";
import { CategoryLabel } from "@/components/dashboard/category-card";

// Data
import { formatFriendlyDate, isLive, isStartingSoon } from "@/lib/data";

// Types
import { RouterOutput } from "@verific/api";

interface ActivityCardProps {
	className?: string;
	activity: RouterOutput["getActivities"]["activities"][number];
}

export function SimpleActivityCard({ activity, className }: ActivityCardProps) {
	return (
		<Link
			href={`/dashboard/activities/${activity.id}`}
			className={cn(
				"hover:bg-foreground/5 flex flex-col items-start justify-start rounded-md border",
				className,
			)}
		>
			<div className="text-foreground flex h-full flex-col items-start justify-center gap-1 p-4">
				<h3 className="font-dashboard font-semibold">
					{activity.name}
				</h3>
				<span className="flex flex-row items-center justify-center gap-2">
					<Image
						className="rounded-full"
						src={activity.speaker?.imageUrl || ""}
						alt="Logo"
						width={14}
						height={14}
					/>
					{activity.speaker && (
						<p className="text-muted-foreground/80 -mt-0.5 text-sm">
							{activity.speaker.name}
						</p>
					)}
				</span>
			</div>
			<div className="bg-input h-[1px] w-full" />
			<ActivityInfo
				category={activity.category}
				dateFrom={activity.dateFrom}
				className="p-4"
			/>
		</Link>
	);
}

export function ActivityCard({ activity, className }: ActivityCardProps) {
	const monitors =
		activity.participants
			?.filter((onActivity) => onActivity.role === "moderator")
			.map((participant) => participant.user.name) || [];

	const participantsAmount =
		activity.participants?.filter(
			(onActivity) => onActivity.role === "participant",
		).length || 0;

	return (
		<Link
			href={`/dashboard/${activity.projectId}/activities/${activity.id}`}
			className="flex w-full"
		>
			<div
				className={cn(
					"bg-card hover:bg-secondary group w-full rounded-md border transition-colors",
					className,
				)}
			>
				<div className="space-y-4 p-6">
					<div className="flex items-start justify-between">
						<h3 className="font-dashboard text-foreground text-xl font-semibold">
							{activity.name}
						</h3>
						<span className="text-muted-foreground text-sm">
							#{activity.id.split("-")[0]}
						</span>
					</div>

					{activity.description && (
						<p className="text-foreground line-clamp-3 text-sm">
							{activity.description}
						</p>
					)}

					<ActivityInfo
						speaker={activity.speaker}
						category={activity.category}
						dateFrom={activity.dateFrom}
					/>

					{(monitors || participantsAmount) && (
						<div className="flex flex-wrap items-center justify-between gap-4 border-t pt-2">
							{monitors && monitors.length > 0 && (
								<div className="flex items-center gap-2">
									<div className="flex -space-x-2">
										{monitors.map((monitor) => (
											<div
												key={monitor}
												className="bg-accent border-card group-hover:border-secondary flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 transition-colors"
											>
												<User className="text-foreground h-3 w-3" />
											</div>
										))}
									</div>
									<span className="text-foreground text-xs">
										Monitorado por {monitors.join(", ")}
									</span>
								</div>
							)}

							{participantsAmount ? (
								<div className="text-foreground flex items-center gap-1 text-xs">
									<Users className="h-4 w-4" />
									<span>
										{participantsAmount === 1
											? "1 participante inscrito"
											: `+ de ${participantsAmount} participantes inscritos`}
									</span>
								</div>
							) : (
								<div className="text-foreground flex items-center gap-1 text-xs">
									<span>Sem participantes inscritos</span>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</Link>
	);
}

interface InfoProps {
	className?: string;
	speaker?: RouterOutput["getActivities"]["activities"][number]["speaker"];
	category: RouterOutput["getActivities"]["activities"][number]["category"];
	dateFrom: Date;
}

function ActivityInfo({ className, speaker, category, dateFrom }: InfoProps) {
	return (
		<div
			className={cn(
				"flex flex-wrap items-center justify-between gap-2",
				className,
				{
					"w-full": !speaker,
				},
			)}
		>
			<div className="flex items-center gap-2">
				<CategoryLabel category={category} />
				{speaker && (
					<span className="text-foreground font-medium">
						{speaker.name}
					</span>
				)}
			</div>

			{isLive(dateFrom) ? (
				<Badge className="gap-2" variant="destructive">
					<div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white">
						<div className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-white" />
					</div>
					AGORA
				</Badge>
			) : isStartingSoon(dateFrom) ? (
				<Badge variant="secondary">
					<Timer className="h-4 w-4" />
					EM INSTANTES
				</Badge>
			) : (
				<div className="text-foreground flex items-center justify-center gap-2">
					{speaker ? (
						<Calendar className="mt-[1.2px] h-4 w-4" />
					) : (
						<Clock className="mt-[1.2px] h-3 w-3" />
					)}
					<p className="leading-0 overflow-ellipsis text-sm">
						{formatFriendlyDate(dateFrom, !!speaker)}
					</p>
				</div>
			)}
		</div>
	);
}
