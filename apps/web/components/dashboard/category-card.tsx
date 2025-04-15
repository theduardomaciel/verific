import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

const EVENT_TYPE_LABELS: Record<string, string> = {
	lecture: "Palestra",
	workshop: "Worskhop",
	"round-table": "Mesa Redonda",
	course: "Minicurso",
};

// Types
import { activityCategories } from "@verific/drizzle/enum/category";

interface CategoryCard {
	className?: string;
	category: (typeof activityCategories)[number];
	speakerName: string;
	hours?: number;
}

export function CategoryCard({
	className,
	category,
	speakerName,
	hours,
}: CategoryCard) {
	return (
		<div
			className={cn(
				"flex h-fit flex-row flex-wrap items-center justify-between gap-4 rounded-lg border bg-transparent px-6 py-2",
				className,
			)}
		>
			<div className="inline-flex items-center justify-start gap-4">
				<CategoryLabel category={category} />
				<p className="text-foreground shrink grow basis-0 text-base font-medium">
					{speakerName}
				</p>
			</div>
			{hours && (
				<div className="inline-flex items-center justify-end gap-2">
					<Clock className="h-3.5 w-3.5" />
					<p className="text-foreground text-left text-sm font-medium">
						{hours}h
					</p>
				</div>
			)}
		</div>
	);
}

export function CategoryLabel({ category }: { category: string }) {
	return (
		<span className="text-muted-foreground/80 text-sm font-bold uppercase select-none">
			{EVENT_TYPE_LABELS[category] || category}
		</span>
	);
}
