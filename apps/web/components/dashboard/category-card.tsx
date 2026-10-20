import { Clock } from "lucide-react";

// Types
import type { activityCategories } from "@verific/drizzle/enum/category";
import { activityCategoryLabels } from "@verific/drizzle/enum/category";

import { formatWorkload } from "@/lib/date";
import { cn } from "@/lib/utils";

interface CategoryCard {
	className?: string;
	category: (typeof activityCategories)[number];
	text: string;
	hours?: number | null;
}

export function CategoryCard({
	className,
	category,
	text,
	hours,
}: CategoryCard) {
	return (
		<div
			className={cn(
				"flex h-fit flex-col gap-3 rounded-lg border bg-transparent px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-6 lg:py-2",
				className,
			)}
		>
			<div className="flex flex-row items-center justify-between gap-4 lg:justify-start">
				<CategoryLabel category={category} />

				{hours ? (
					<CategoryWorkload hours={hours} className="lg:hidden" />
				) : null}
			</div>

			<p
				title={text}
				className="text-foreground line-clamp-2 min-w-0 flex-1 text-base font-medium lg:line-clamp-1"
			>
				{text}
			</p>

			{hours ? (
				<CategoryWorkload
					hours={hours}
					className="hidden lg:flex lg:shrink-0"
				/>
			) : null}
		</div>
	);
}

function CategoryWorkload({
	className,
	hours,
}: {
	className?: string;
	hours: number;
}) {
	return (
		<div
			className={cn(
				"inline-flex items-center justify-end gap-2",
				className,
			)}
		>
			<Clock className="h-3.5 w-3.5" />
			<p className="text-foreground text-left text-sm font-medium">
				{formatWorkload(hours ?? 0)}
			</p>
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
