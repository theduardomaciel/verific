import Image from "next/image";

// Icons
import { Check, User, Clock, BarcodeIcon } from "lucide-react";
import AndroidIcon from "@/public/icons/android.svg";
import AppleIcon from "@/public/icons/apple.svg";

import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

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
				"text-card-foreground relative overflow-hidden rounded-3xl drop-shadow-[5px_5px_10px_rgba(191,191,191,1)] dark:drop-shadow-none",
				className,
			)}
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

						<div className="text-muted-foreground mb-6 flex items-center justify-evenly text-sm">
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
					</div>

					{isModerator && (
						<div className="mt-auto hidden items-center justify-between border-t pt-4 md:flex">
							<div className="text-muted-foreground flex items-center">
								<User size={18} className="mr-2" />
								<span>Participantes credenciados</span>
							</div>
							<div className="text-2xl font-bold">
								{currentParticipants}
							</div>
						</div>
					)}
				</div>

				{/* Mobile: full width with fixed height - Desktop: fixed width with full height */}
				<div className="relative h-16 w-full md:h-auto md:w-[7.5%] md:flex-col">
					{/* Line decoration - vertical on mobile, horizontal on desktop */}
					<div className="border-foreground absolute top-1/2 left-1/2 h-[1px] w-3/4 -translate-x-1/2 -translate-y-1/2 rounded border border-dashed opacity-30 md:h-3/4 md:w-[1px]" />

					<div className="flex h-full flex-row md:flex-col">
						{/* Left/Top cutout */}
						<div className="relative aspect-square h-full md:h-auto md:w-full md:pb-[100%]">
							<svg
								className="text-card absolute inset-0 h-full w-full"
								viewBox="0 0 99 99"
								preserveAspectRatio="none"
							>
								<defs>
									<mask id="inverted-circle-mobile-1">
										<rect
											width="100"
											height="100"
											fill="white"
										/>
										<circle
											cx="0"
											cy="50"
											r="50"
											fill="black"
										/>
									</mask>
									<mask id="inverted-circle-desktop-1">
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
									className="mask-[url(#inverted-circle-mobile-1)] md:mask-[url(#inverted-circle-desktop-1)]"
								/>
							</svg>
						</div>

						{/* Middle section */}
						<div className="bg-card h-full flex-1 md:aspect-square md:w-full" />

						{/* Right/Bottom cutout */}
						<div className="relative aspect-square h-full md:h-auto md:w-full md:pt-[100%]">
							<svg
								className="text-card absolute inset-0 h-full w-full"
								viewBox="0 0 99 99"
								preserveAspectRatio="none"
							>
								<defs>
									<mask id="inverted-circle-mobile-2">
										<rect
											width="100"
											height="100"
											fill="white"
										/>
										<circle
											cx="100"
											cy="50"
											r="50"
											fill="black"
										/>
									</mask>
									<mask id="inverted-circle-desktop-2">
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
									className="mask-[url(#inverted-circle-mobile-2)] md:mask-[url(#inverted-circle-desktop-2)]"
								/>
							</svg>
						</div>
					</div>
				</div>

				{/* Right section */}
				<div className="bg-card flex w-full flex-col items-center justify-center px-6 md:w-64 md:pl-0">
					{isModerator ? (
						<>
							<div className="hidden w-full flex-col items-center justify-center py-6 md:flex">
								<p className="mb-6 text-center">
									Credencie os participantes do evento pelo
									seu telefone!
								</p>
								<div className="flex space-x-4">
									<AppleIcon className="flex h-6 w-5 items-center justify-center text-black dark:text-white" />
									<AndroidIcon className="flex w-8 items-center justify-center" />
								</div>
							</div>
							<div className="flex w-full flex-col items-center justify-center gap-6 py-6 md:hidden">
								<Button
									className="flex w-full md:hidden"
									size={"lg"}
								>
									<BarcodeIcon />
									Escanear crachás
								</Button>
								<div className="flex w-full items-center justify-between">
									<div className="text-muted-foreground flex items-center">
										<User size={18} className="mr-2" />
										<span>Participantes credenciados</span>
									</div>
									<div className="text-2xl font-bold">
										{currentParticipants}
									</div>
								</div>
							</div>
						</>
					) : (
						<>
							<div className="flex w-full items-center justify-between py-8 md:flex-col md:items-center md:justify-center md:border-0 md:pt-0">
								<div className="text-muted-foreground md:text-card-foreground flex items-center md:flex-col md:gap-3 md:text-center">
									<Check className="mr-2 size-6 md:mr-0 md:size-12" />
									<span className="md:mb-2">
										Presença confirmada
									</span>
								</div>
								<div className="text-2xl font-bold md:text-4xl">
									{attendanceTime}
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
