import { cn } from "@/lib/utils";

export interface TagLike {
	id: string;
	name: string;
	color: string;
}

export function TagBadge({
	tag,
	className,
}: {
	tag: TagLike;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
				className,
			)}
		>
			<span
				className="h-2 w-2 shrink-0 rounded-full"
				style={{ backgroundColor: tag.color }}
			/>
			{tag.name}
		</span>
	);
}

export function TagBadges({
	tags,
	className,
}: {
	tags: TagLike[];
	className?: string;
}) {
	if (tags.length === 0) return null;
	return (
		<div className={cn("flex flex-wrap gap-1.5", className)}>
			{tags.map((tag) => (
				<TagBadge key={tag.id} tag={tag} />
			))}
		</div>
	);
}
