"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

export function FiltersPanel({ children }: { children: React.ReactNode }) {
	const isMobile = useIsMobile();

	return (
		<Accordion className="border rounded-md px-6" type="single" collapsible>
			<AccordionItem className="gap-9" value="main">
				<AccordionTrigger className="py-6 cursor-pointer">
					Filtros
				</AccordionTrigger>
				<AccordionContent className="pb-6">{children}</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
