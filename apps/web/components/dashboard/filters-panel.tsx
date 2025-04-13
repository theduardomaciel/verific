import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

export function FiltersPanel({ children }: { children: React.ReactNode }) {
	return (
		<Accordion
			className="border rounded-md px-4 md:px-6"
			type="single"
			defaultValue="main"
			collapsible
		>
			<AccordionItem className="gap-9" value="main">
				<AccordionTrigger className="px-y md:py-6 cursor-pointer font-semibold">
					Filtros
				</AccordionTrigger>
				<AccordionContent className="pb-4 md:pb-6 space-y-8">
					{children}
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
