import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

export function FiltersPanel({ children }: { children: React.ReactNode }) {
	return (
		<Accordion
			className="rounded-md border px-4 md:px-6"
			type="single"
			defaultValue="main"
			collapsible
		>
			<AccordionItem className="gap-9" value="main">
				<AccordionTrigger className="px-y cursor-pointer font-semibold md:py-6">
					Filtros
				</AccordionTrigger>
				<AccordionContent className="space-y-8 pb-4 md:pb-6">
					{children}
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
