"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ExternalLinkIcon } from "lucide-react";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

import { ActivityTicket } from "@/components/activity/activity-ticket";
import { Empty } from "@/components/empty";
import { useEventTimeZone } from "@/components/event-time-zone";

import { useToday } from "@/hooks/use-now";
import { categorizeByDate, getFirstSessionStart } from "@/lib/date";

interface AccountWrapperProps {
	eventUrl: string;
	activities: Array<any>;
	checkInCode: string | null;
	checkoutEnabled?: boolean;
}

export function AccountWrapper({
	eventUrl,
	activities,
	checkInCode,
	checkoutEnabled = false,
}: AccountWrapperProps) {
	const fallbackDate = useState(() => new Date())[0];
	const timeZone = useEventTimeZone();
	const today = useToday(timeZone);
	const { grouped, categories, initialExpanded } = useMemo(() => {
		const { grouped, categories } = categorizeByDate(
			activities,
			(item) => getFirstSessionStart(item.sessions) ?? fallbackDate,
			timeZone,
			today,
		);
		const hasToday = categories.includes("Hoje");
		const initialExpanded = hasToday ? ["Hoje"] : categories;
		return { grouped, categories, initialExpanded };
	}, [activities, fallbackDate, timeZone, today]);

	const [expandedCategories, setExpandedCategories] =
		useState<string[]>(initialExpanded);

	// Reage a mudanças de dados (estado inicial já correto, sem flash).
	// Ajuste durante a renderização em vez de efeito: sem render cascata.
	const [prevInitialExpanded, setPrevInitialExpanded] =
		useState(initialExpanded);
	if (prevInitialExpanded !== initialExpanded) {
		setPrevInitialExpanded(initialExpanded);
		setExpandedCategories(initialExpanded);
	}

	return (
		<div className="flex w-full flex-col gap-4 md:gap-12">
			{activities.length > 0 ? (
				<Accordion
					type="multiple"
					value={expandedCategories}
					onValueChange={setExpandedCategories}
					className="w-full"
				>
					{categories.map((category) => (
						<AccordionItem key={category} value={category}>
							<AccordionTrigger className="text-foreground font-subtitle text-xl font-bold">
								{category}
							</AccordionTrigger>
							{/* Folga para a sombra dos ingressos: o conteúdo corta o que passa da borda */}
							<AccordionContent className="-mx-4 px-4 pb-8">
								<ul className="flex w-full flex-col gap-8">
									{grouped.get(category)!.map((activity) => (
										<li
											key={activity.id}
											className="w-full"
										>
											<ActivityTicket
												activity={activity}
												checkInCode={checkInCode || ""}
												projectUrl={eventUrl}
												checkoutEnabled={
													checkoutEnabled
												}
											/>
										</li>
									))}
								</ul>
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
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
