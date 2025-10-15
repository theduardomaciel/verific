import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";

import { cn } from "@/lib/utils";

// Icons
import { Check, User, Clock } from "lucide-react";
import AndroidIcon from "@/public/icons/android.svg";
import AppleIcon from "@/public/icons/apple.svg";

// Components
import { BadgeScanner } from "@/components/badge-scanner";
import { ActivityStatus } from "./activity-status";

// Utils
import { formatFriendlyDate } from "@/lib/data";

// API
import { RouterOutput } from "@verific/api";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export interface WorkshopTicketProps {
	className?: string;
	onActivity: RouterOutput["getActivitiesFromParticipant"]["activities"][0];
	role: "moderator" | "participant";
}

export function ActivityTicket({
	onActivity,
	role,
	className,
}: WorkshopTicketProps) {
	const activity = onActivity.activity;
	const isModerator = role === "moderator";

	const startTime = activity.dateFrom.toLocaleString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
	});
	const endTime = activity.dateTo.toLocaleString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
	});

	const credentialedParticipantsAmount =
		activity.participantsOnActivity.filter(
			(participant) => participant.joinedAt !== null,
		).length;

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
				<div className="bg-card flex flex-col p-6 md:max-w-3/5">
					<div>
						<div className="mb-6 flex w-full flex-wrap items-center justify-between gap-6">
							<h2 className="line-clamp-2 text-2xl leading-tight font-bold break-words">
								{activity.name}
							</h2>
							<ActivityStatus
								className="mt-1"
								date={activity.dateFrom}
								dateFormat={{
									includeDay: true,
									includeHour: false,
								}}
							/>
						</div>

						{activity.description && (
							<div className="text-muted-foreground mb-6 text-sm">
								<p>{activity.description}</p>
								<button className="mt-1">Ler mais</button>
							</div>
						)}

						<div className="mb-6 flex w-full items-center justify-between">
							<span className="text-xl">{startTime}</span>
							<div className="mx-4 flex flex-1 items-center justify-center md:mx-8">
								<div className="relative flex h-4 w-full items-center">
									<div className="bg-foreground absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2" />
									<span className="block md:hidden">
										{Array(3)
											.fill(0)
											.map((_, i) => (
												<div
													key={`dot-${i}`}
													className="bg-foreground absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
													style={{
														left: `${(i / 2) * 100}%`,
													}}
												/>
											))}
									</span>
									<span className="hidden md:block">
										{Array(7)
											.fill(0)
											.map((_, i) => (
												<div
													key={`dot-${i}`}
													className="bg-foreground absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
													style={{
														left: `${(i / 6) * 100}%`,
													}}
												/>
											))}
									</span>
								</div>
							</div>
							<span className="text-xl">{endTime}</span>
						</div>

						{activity.participantsLimit || activity.tolerance ? (
							<div className="text-muted-foreground mb-6 flex items-center justify-evenly text-sm">
								{activity.participantsLimit ? (
									<div className="flex items-center">
										<User size={16} className="mr-1" />
										<span>
											{activity.participantsLimit} máx
										</span>
									</div>
								) : null}
								{activity.tolerance ? (
									<div className="flex items-center">
										<Clock size={16} className="mr-1" />
										<span>
											{activity.tolerance} de tolerância
										</span>
									</div>
								) : null}
							</div>
						) : null}

						{activity.speaker && (
							<div className="bg-card mb-6 rounded-lg border p-4">
								<div className="flex flex-row items-start gap-4">
									<Avatar
										className={cn(
											"aspect-square h-12 w-12 object-cover",
											{
												"h-7 w-7":
													!activity.speaker.imageUrl,
											},
										)}
									>
										<AvatarImage
											src={
												activity.speaker.imageUrl ||
												undefined
											}
										/>
										<AvatarFallback>
											<User
												className={cn(
													"h-6 w-6 text-white",
													{
														"h-4 w-4":
															!activity.speaker
																.imageUrl,
													},
												)}
											/>
										</AvatarFallback>
									</Avatar>
									<div>
										<h3 className="font-medium">
											{activity.speaker.name}
										</h3>
										<p className="text-muted-foreground text-sm">
											{activity.speaker.description}
										</p>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* TODO: Atualmente, exibindo a quantidade de participantes, não a quantidade de participantes credenciados */}
					{isModerator ? (
						<div className="mt-auto hidden items-center justify-between border-t pt-4 md:flex">
							<div className="text-muted-foreground flex items-center">
								<User size={18} className="mr-2" />
								<span>Participantes credenciados</span>
							</div>
							<div className="text-2xl font-bold">
								{credentialedParticipantsAmount}
							</div>
						</div>
					) : null}
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
				<div className="bg-card flex w-full flex-1 flex-col items-center justify-center px-6 md:pl-0">
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
								<BadgeScanner activityId={activity.id} />
								<div className="flex w-full items-center justify-between">
									<div className="text-muted-foreground flex items-center">
										<User size={18} className="mr-2" />
										<span>Participantes credenciados</span>
									</div>
									<div className="text-2xl font-bold">
										{credentialedParticipantsAmount}
									</div>
								</div>
							</div>
						</>
					) : onActivity.joinedAt ? (
						<div className="flex w-full items-center justify-between py-8 md:flex-col md:items-center md:justify-center md:border-0 md:pt-0">
							<div className="text-muted-foreground md:text-card-foreground flex items-center md:flex-col md:gap-3 md:text-center">
								<Check className="mr-2 size-6 md:mr-0 md:size-12" />
								<span className="md:mb-2">
									Presença confirmada
								</span>
							</div>
							<div className="text-2xl font-bold md:text-4xl">
								{formatFriendlyDate(onActivity.joinedAt)}
							</div>
						</div>
					) : (
						<div className="flex flex-col items-center justify-center gap-4 pt-6 pb-8">
							<p className="text-muted-foreground text-center">
								Confirme sua presença no evento exibindo o QR
								Code para o moderador
							</p>
							<QRCodeSVG
								className="rounded-sm bg-white p-3"
								value={onActivity.participantId}
								width={200}
								height={200}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
