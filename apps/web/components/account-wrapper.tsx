"use client";

import Link from "next/link";

// Components
import { ExternalLinkIcon } from "lucide-react";
import * as EventContainer from "@/components/landing/event-container";
import { ActivityTicket } from "@/components/activity/activity-ticket";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/empty";

// Utils
import { categorizeByDate } from "@/lib/date";

interface AccountWrapperProps {
	eventUrl: string;
	activities: Array<any>;
	participantId: string | null;
}

export function AccountWrapper({
	eventUrl,
	activities,
	participantId,
}: AccountWrapperProps) {
	const { grouped, categories } = categorizeByDate(
		activities,
		(item) => item.dateFrom,
	);

	return (
		<EventContainer.Content>
			<div className="container-p mb-8 flex w-full flex-col gap-4 md:gap-12">
				{activities.length > 0 ? (
					<>
						<h2 className="text-foreground font-dashboard text-3xl font-semibold">
							Seus eventos
						</h2>
						{categories.map((category) => (
							<div key={category} className="flex flex-col gap-4">
								<h3 className="text-foreground font-dashboard text-xl font-semibold">
									{category}
								</h3>
								<ul className="flex w-full flex-col gap-4">
									{grouped.get(category)!.map((activity) => (
										<li
											key={activity.id}
											className="w-full"
										>
											<ActivityTicket
												activity={activity}
												participantId={
													participantId || ""
												}
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
						description={
							<div className="flex flex-col items-center justify-center gap-4">
								Você ainda não se inscreveu em nenhuma
								atividade.
								<Button size={"lg"} asChild>
									<Link href={`/${eventUrl}/schedule`}>
										Explore a programação e inscreva-se
										<span className="text-xs">
											<ExternalLinkIcon className="ml-2" />
										</span>
									</Link>
								</Button>
							</div>
						}
					/>
				)}
			</div>
		</EventContainer.Content>
	);
}
