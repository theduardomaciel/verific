import Image from "next/image";

// Icons
import { Check, User, Clock, BarcodeIcon } from "lucide-react";
import AndroidIcon from "@/public/icons/android.svg";
import AppleIcon from "@/public/icons/apple.svg";

import { cn } from "@/lib/utils";

export interface WorkshopTicketProps {
	title: string;
	startTime: string;
	endTime: string;
	maxParticipants: number;
	currentParticipants: number;
	tolerance: string;
	speakerName?: string;
	speakerRole?: string;
	speakerImage?: string;
	description?: string;
	attendanceTime?: string;
	role: "moderator" | "user";
	className?: string;
}

export function ActivityTicket({
	title,
	startTime,
	endTime,
	maxParticipants,
	currentParticipants,
	tolerance,
	speakerName,
	speakerRole,
	speakerImage,
	description,
	attendanceTime,
	role,
	className,
}: WorkshopTicketProps) {
	const isModerator = role === "moderator";

	return (
		<div
			className={cn(
				"text-card-foreground relative overflow-hidden rounded-3xl",
				className,
			)}
			style={{
				filter: "drop-shadow(5px 5px 10px #bfbfbf)",
			}}
		>
			{/* Main content - flex-col on mobile, flex-row on md+ */}
			<div className="flex flex-col md:flex-row">
				{/* Left/Top section */}
				<div className="bg-card flex flex-1 flex-col p-6">
					<div className="flex-grow">
						<div className="mb-6 flex items-start justify-between">
							<div>
								<h2 className="text-2xl font-bold">{title}</h2>
							</div>
							<div className="bg-destructive animate-pulse rounded px-3 py-1 text-xs font-bold !text-white">
								AGORA
							</div>
						</div>

						{description && (
							<div className="text-muted-foreground mb-6 text-sm">
								<p>{description}</p>
								<button className="mt-1">Ler mais</button>
							</div>
						)}

						<div className="mb-6 flex items-center">
							<span className="text-xl">{startTime}</span>
							<div className="mx-3 flex items-center">
								{Array(7)
									.fill(0)
									.map((_, i) => (
										<>
											{i > 0 && (
												<div
													key={`line-${i}`}
													className="bg-foreground h-[1px] w-4"
												></div>
											)}
											<div
												key={`dot-${i}`}
												className="bg-foreground h-1 w-1 rounded-full"
											></div>
										</>
									))}
							</div>
							<span className="text-xl">{endTime}</span>
						</div>

						<div className="text-muted-foreground mb-6 flex items-center justify-between text-sm">
							<div className="flex items-center">
								<User size={16} className="mr-1" />
								<span>{maxParticipants} máx</span>
							</div>
							<div className="flex items-center">
								<Clock size={16} className="mr-1" />
								<span>{tolerance} de tolerância</span>
							</div>
						</div>

						{speakerName && (
							<div className="bg-card mb-6 rounded-lg border p-4">
								<div className="flex">
									<div className="mr-3 h-12 w-12 overflow-hidden rounded-full bg-gray-500">
										<Image
											src={
												speakerImage ||
												"/placeholder.svg?height=48&width=48"
											}
											alt={speakerName}
											width={48}
											height={48}
											className="aspect-square object-cover"
										/>
									</div>
									<div>
										<h3 className="font-medium">
											{speakerName}
										</h3>
										<p className="text-muted-foreground text-sm">
											{speakerRole}
										</p>
									</div>
								</div>
							</div>
						)}

						{/* Scan button only visible on mobile for moderator */}
						{isModerator && (
							<button className="mb-6 flex w-full items-center justify-center rounded-md bg-[#3b82f6] py-3 md:hidden">
								<BarcodeIcon />
								Escanear crachás
							</button>
						)}
					</div>

					{/* Footer integrated into main section */}
					<div className="mt-auto border-t border-[#404040] pt-4">
						{isModerator ? (
							<div className="flex items-center justify-between">
								<div className="text-muted-foreground flex items-center">
									<User size={18} className="mr-2" />
									<span>Participantes credenciados</span>
								</div>
								<div className="text-2xl font-bold">
									{currentParticipants}
								</div>
							</div>
						) : (
							<div className="flex items-center justify-between">
								<div className="text-muted-foreground flex items-center">
									<Check size={18} className="mr-2" />
									<span>Presença confirmada</span>
								</div>
								<div className="text-2xl font-bold">
									{attendanceTime}
								</div>
							</div>
						)}
					</div>
				</div>

				<div
					className="bg-card relative flex w-[10%] flex-col"
					/* style={{
						clipPath: "url(#myClip)",
					}} */
				>
					{/* Fill available height using flex-grow */}
					<div className="flex-1"></div>
					{/* Line at the middle */}
					<div className="border-foreground absolute top-1/2 left-1/2 h-3/4 w-[1px] -translate-x-1/2 -translate-y-1/2 rounded border border-dashed opacity-30" />
					{/* Horizontal ticket cutouts */}
					<div className="bg-background absolute top-0 left-1/2 -mt-3 hidden h-6 w-12 -translate-x-1/2 transform rounded-b-full md:block"></div>
					<div className="bg-background absolute bottom-0 left-1/2 -mb-3 hidden h-6 w-12 -translate-x-1/2 transform rounded-t-full md:block"></div>
				</div>

				<div className="relative flex w-[7.5%] flex-col">
					{/* Fill available height using flex-grow */}
					<div className="flex flex-1 flex-col">
						{/* Line at the middle */}
						<div className="border-foreground absolute top-1/2 left-1/2 h-3/4 w-[1px] -translate-x-1/2 -translate-y-1/2 rounded border border-dashed opacity-30" />
						<div className="relative w-full pb-[100%]">
							<svg
								className="text-card absolute inset-0 h-full w-full"
								viewBox="0 0 99 99"
								preserveAspectRatio="none"
							>
								<defs>
									<mask id="inverted-circle1">
										<rect
											width="100"
											height="100"
											fill="white"
										/>
										<circle
											cx="50"
											cy="0"
											r="50"
											fill="black"
										/>
									</mask>
								</defs>
								<rect
									width="100"
									height="100"
									fill="currentColor"
									mask="url(#inverted-circle1)"
								/>
							</svg>
						</div>
						<div className="bg-card aspect-square w-full flex-1" />
						<div className="relative w-full pt-[100%]">
							<svg
								className="text-card absolute inset-0 h-full w-full"
								viewBox="0 0 99 99"
								preserveAspectRatio="none"
							>
								<defs>
									<mask id="inverted-circle2">
										<rect
											width="100"
											height="100"
											fill="white"
										/>
										<circle
											cx="50"
											cy="100"
											r="50"
											fill="black"
										/>
									</mask>
								</defs>
								<rect
									width="100"
									height="100"
									fill="currentColor"
									mask="url(#inverted-circle2)"
								/>
							</svg>
						</div>
					</div>
				</div>

				{/* Right section */}
				<div className="bg-card hidden w-64 flex-col items-center justify-center py-6 pr-6 md:flex">
					{isModerator ? (
						<>
							<p className="mb-6 text-center">
								Credencie os participantes do evento pelo seu
								telefone!
							</p>
							<div className="flex space-x-4">
								<AppleIcon className="flex h-6 w-5 items-center justify-center text-black dark:text-white" />
								<AndroidIcon className="flex w-8 items-center justify-center" />
							</div>
						</>
					) : (
						<>
							<span className="flex flex-col items-center justify-center gap-3">
								<Check size={36} />
								<p className="mb-2 text-center">
									Presença confirmada
								</p>
							</span>
							<p className="text-4xl font-bold">
								{attendanceTime}
							</p>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
