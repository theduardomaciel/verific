import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

// Icons

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
				<span className="text-muted-foreground text-base font-extrabold">
					{category}
				</span>
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
