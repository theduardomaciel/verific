import { cn } from "@/lib/utils";
import { Calendar, User, Users } from "lucide-react";
import Link from "next/link";

interface ActivityCardProps {
	title: string;
	speaker: string;
	type: string;
	time: "AGORA" | "EM BREVE" | string;
	variant?: "simple" | "expanded";
	description?: string;
	eventId?: string;
	monitors?: string[];
	participants?: number;
	className?: string;
}

export function ActivityCard({
	title,
	speaker,
	type,
	time,
	variant = "simple",
	description,
	eventId,
	monitors,
	participants,
	className,
}: ActivityCardProps) {
	if (variant === "expanded") {
		return (
			<div className={cn("rounded-md border bg-white", className)}>
				<div className="p-6 space-y-4">
					<div className="flex justify-between items-start">
						<h3 className="text-xl font-semibold font-dashboard text-gray-900">
							{title}
						</h3>
						{eventId && (
							<span className="text-sm text-gray-500">#{eventId}</span>
						)}
					</div>

					{description && (
						<p className="text-gray-600 text-sm line-clamp-3">{description}</p>
					)}

					<div className="flex justify-between items-center">
						<div className="flex items-center gap-2">
							<span className="text-gray-500 uppercase text-sm">{type}</span>
							<span className="text-gray-700 font-medium">{speaker}</span>
						</div>

						<div className="flex items-center gap-2 text-gray-600">
							<Calendar className="h-4 w-4" />
							<span className="text-sm">{time}</span>
						</div>
					</div>

					{(monitors || participants) && (
						<div className="flex justify-between items-center pt-2 border-t">
							{monitors && monitors.length > 0 && (
								<div className="flex items-center gap-2">
									<div className="flex -space-x-2">
										{monitors.map((monitor, _) => (
											<div
												key={monitor}
												className="h-6 w-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center overflow-hidden"
											>
												<User className="h-3 w-3 text-gray-600" />
											</div>
										))}
									</div>
									<span className="text-xs text-gray-600">
										Monitorado por {monitors.join(", ")}
									</span>
								</div>
							)}

							{participants && (
								<div className="flex items-center gap-1 text-xs text-gray-600">
									<Users className="h-4 w-4" />
									<span>+ de {participants} participantes inscritos</span>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		);
	}

	// Simple variant (original implementation)
	return (
		<Link
			className={cn(
				"flex hover:bg-foreground/5 flex-col items-start justify-start space-y-2 rounded-md border p-4",
				className,
			)}
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
