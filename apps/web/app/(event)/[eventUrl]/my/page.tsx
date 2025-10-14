import { redirect } from "next/navigation";

// Components
import { ActivityTicket } from "@/components/activity/activity-ticket";
import * as EventContainer from "@/components/landing/event-container";

// API
import { serverClient } from "@/lib/trpc/server";
import { Empty } from "@/components/empty";

export default async function EventAccountPage({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}) {
	const { eventUrl } = await params;

	// TODO: O "role" atualmente é definido por projeto/evento, ao invés de por atividade.
	const { activities, isParticipant, role } =
		await serverClient.getActivitiesFromParticipant({
			projectUrl: eventUrl,
		});

	if (!isParticipant) {
		redirect(`/${eventUrl}/subscribe`);
	}

	// Group activities by date categories
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);

	const grouped = new Map<string, typeof activities>();
	for (const onActivity of activities) {
		const activityDate = new Date(onActivity.activity.dateFrom);
		activityDate.setHours(0, 0, 0, 0);
		let category: string;
		if (activityDate.getTime() === today.getTime()) {
			category = "Hoje";
		} else if (activityDate.getTime() === tomorrow.getTime()) {
			category = "Amanhã";
		} else {
			category = activityDate.toLocaleDateString("pt-BR", {
				day: "2-digit",
				month: "2-digit",
			});
		}
		if (!grouped.has(category)) {
			grouped.set(category, []);
		}
		grouped.get(category)!.push(onActivity);
	}

	const categories = Array.from(grouped.keys()).sort((a, b) => {
		if (a === "Hoje") return -1;
		if (b === "Hoje") return 1;
		if (a === "Amanhã") return -1;
		if (b === "Amanhã") return 1;
		// Parse dates (DD/MM to Date)
		const dateA = new Date(a.split("/").reverse().join("-"));
		const dateB = new Date(b.split("/").reverse().join("-"));
		return dateA.getTime() - dateB.getTime();
	});

	return (
		<EventContainer.Holder>
			<EventContainer.Hero coverUrl={"/images/hero-bg.png"}>
				<div className="z-10 flex flex-1 flex-col items-start justify-center">
					<h1 className="mb-4 text-5xl font-bold text-white">
						Sua Conta
					</h1>
					<p className="text-primary-foreground text-base font-semibold md:max-w-md">
						Gerencie seus dados, eventos inscritos e preferências
						com facilidade.
					</p>
				</div>
			</EventContainer.Hero>
			<EventContainer.Content>
				<div className="container-p mb-8 flex w-full flex-col gap-4 md:gap-12">
					{activities.length > 0 ? (
						<>
							<h2 className="text-foreground font-dashboard text-3xl font-semibold">
								Seus eventos
							</h2>
							{categories.map((category) => (
								<div
									key={category}
									className="flex flex-col gap-4"
								>
									<h3 className="text-foreground font-dashboard text-xl font-semibold">
										{category}
									</h3>
									<ul className="grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
										{grouped
											.get(category)!
											.map((onActivity) => (
												<li
													key={onActivity.activityId}
													className="w-full"
												>
													<ActivityTicket
														onActivity={onActivity}
														role={role!}
													/>
												</li>
											))}
									</ul>
								</div>
							))}
						</>
					) : (
						<Empty
							title="Nenhuma atividade encontrada"
							description="Você ainda não se inscreveu em nenhuma atividade."
						/>
					)}
				</div>
			</EventContainer.Content>
		</EventContainer.Holder>
	);
}
