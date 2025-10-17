import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

// Types
import {
	activityCategories,
	activityCategoryLabels,
} from "@verific/drizzle/enum/category";

// Lib
import { listToString } from "@/lib/i18n";

interface CategoryCard {
	className?: string;
	category: (typeof activityCategories)[number];
	speakersName: string[];
	hours?: number | null;
}

export function CategoryCard({
	className,
	category,
	speakersName,
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
					{listToString(speakersName)}
				</p>
			</div>
			{hours ? (
				<div className="inline-flex items-center justify-end gap-2">
					<Clock className="h-3.5 w-3.5" />
					<p className="text-foreground text-left text-sm font-medium">
						{hours}h
					</p>
				</div>
			) : null}
		</div>
	);
}

export function CategoryLabel({ category }: { category: string }) {
	return (
		<span className="text-muted-foreground/80 text-sm font-bold uppercase select-none">
			{activityCategoryLabels[
				category as keyof typeof activityCategoryLabels
			] || category}
		</span>
	);
}
