import Link from "next/link";

import { cn } from "@/lib/utils";

// Icons
import { User, Users } from "lucide-react";

// Components
import { CategoryLabel } from "@/components/dashboard/category-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActivityStatus } from "../activity-status";

// Lib
import { listToString } from "@/lib/i18n";

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
				<h3 className="font-dashboard font-semibold first-letter:capitalize">
					{activity.name}
				</h3>
				{activity.speakers && (
					<span className="flex flex-row items-center justify-center gap-2">
						<div className="flex flex-row items-center justify-start -space-x-2">
							{activity.speakers.map((speaker) => (
								<Avatar
									className={cn("h-5 w-5")}
									key={speaker.id}
								>
									<AvatarImage
										src={speaker?.imageUrl || ""}
									/>
									<AvatarFallback className="bg-primary uppercase">
										<User className="text-primary-foreground h-3 w-3" />
									</AvatarFallback>
								</Avatar>
							))}
						</div>
						<p className="text-muted-foreground/80 -mt-0.5 text-sm">
							{listToString(activity.speakers.map((s) => s.name))}
						</p>
					</span>
				)}
			</div>
			<div className="bg-input h-[1px] w-full border-t" />
			<div
				className={
					"flex w-full flex-wrap items-center justify-between gap-2 p-4"
				}
			>
				<CategoryLabel category={activity.category} />
				<ActivityStatus
					date={activity.dateFrom}
					dateFormat={{ includeDay: true, includeHour: true }}
				/>
			</div>
		</Link>
	);
}

export function ActivityCard({ activity, className }: ActivityCardProps) {
	const monitors =
		activity.participants
			?.filter((onActivity) => onActivity.role === "monitor")
			.map((participant) => participant.user.name) || [];

	const participantsAmount =
		activity.participants?.filter(
			(onActivity) => onActivity.role === "participant",
		).length || 0;

	return (
		<Link
			href={`/dashboard/activities/${activity.id}`}
			className="flex w-full"
		>
			<div
				className={cn(
					"bg-card hover:bg-secondary group w-full rounded-md border transition-colors",
					className,
				)}
			>
				<div className="space-y-4 p-6">
					<div className="flex items-center justify-between">
						<h3 className="font-dashboard text-foreground text-xl font-semibold first-letter:capitalize">
							{activity.name}
						</h3>
						<span className="text-muted-foreground text-sm">
							<ActivityStatus
								date={activity.dateFrom}
								dateFormat={{
									includeDay: true,
									includeHour: true,
								}}
							/>
						</span>
					</div>

					{activity.description && (
						<p className="text-foreground line-clamp-3 text-sm">
							{activity.description}
						</p>
					)}

					{activity.speakers.length ? (
						<div className="flex items-center gap-2">
							<CategoryLabel category={activity.category} />
							{activity.speakers && (
								<span className="text-foreground font-medium">
									{listToString(
										activity.speakers.map(
											(speaker) => speaker.name,
										),
									)}
								</span>
							)}
						</div>
					) : null}

					{(monitors || participantsAmount) &&
						activity.isRegistrationOpen && (
							<div className="flex flex-wrap items-center justify-between gap-4 border-t pt-3">
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
											Monitorado por{" "}
											{listToString(monitors)}
										</span>
									</div>
								)}

								{participantsAmount ? (
									<div className="text-foreground flex items-center gap-1 text-sm">
										<Users className="h-4 w-4" />
										<span>
											{participantsAmount === 1
												? "1 participante inscrito"
												: `+ de ${participantsAmount} participantes inscritos`}
										</span>
									</div>
								) : (
									<div className="text-foreground mt-2 flex items-center gap-1 text-sm">
										Nenhum participante inscrito
									</div>
								)}
							</div>
						)}
				</div>
			</div>
		</Link>
	);
}
