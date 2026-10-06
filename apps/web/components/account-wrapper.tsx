"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";

// Components
import { ExternalLinkIcon } from "lucide-react";
import { ActivityTicket } from "@/components/activity/activity-ticket";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/empty";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

// Utils
import { categorizeByDate, getFirstSessionStart } from "@/lib/date";

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
	const { grouped, categories, initialExpanded } = useMemo(() => {
		const { grouped, categories } = categorizeByDate(
			activities,
			(item) => getFirstSessionStart(item.sessions) ?? new Date(),
		);
		const hasToday = categories.includes("Hoje");
		const initialExpanded = hasToday ? ["Hoje"] : categories;
		return { grouped, categories, initialExpanded };
	}, [activities]);

	const [expandedCategories, setExpandedCategories] =
		useState<string[]>(initialExpanded);

	// Reage a mudanças de dados (estado inicial já correto, sem flash).
	useEffect(() => {
		setExpandedCategories(initialExpanded);
	}, [initialExpanded]);

	return (
		<div className="flex w-full flex-col gap-4 md:gap-12">
			{activities.length > 0 ? (
				<>
					<h2 className="text-foreground font-dashboard text-3xl font-semibold">
						Seus eventos
					</h2>
					<Accordion
						type="multiple"
						value={expandedCategories}
						onValueChange={setExpandedCategories}
						className="w-full"
					>
						{categories.map((category) => (
							<AccordionItem key={category} value={category}>
								<AccordionTrigger className="text-foreground font-dashboard text-xl font-semibold">
									{category}
								</AccordionTrigger>
								<AccordionContent>
									<ul className="flex w-full flex-col gap-4">
										{grouped
											.get(category)!
											.map((activity) => (
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
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</>
			) : (
				<Empty
					title="Nenhuma atividade encontrada"
					description={
						<div className="flex w-full flex-col items-center justify-center gap-4 px-6 text-center">
							Você ainda não se inscreveu em nenhuma atividade.
							<Button
								size="lg"
								asChild
								className="h-fit! py-2 whitespace-normal max-sm:w-full"
							>
								<Link
									href={`/${eventUrl}/schedule`}
									className="text-center"
								>
									Explore a programação e inscreva-se
									<ExternalLinkIcon />
								</Link>
							</Button>
						</div>
					}
				/>
			)}
		</div>
	);
}
