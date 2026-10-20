"use client";

import { useLayoutEffect, useRef, useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

interface CollapsibleDescriptionProps {
	description?: string | null;
	className?: string;
}

export function CollapsibleDescription({
	description,
	className,
}: CollapsibleDescriptionProps) {
	const contentRef = useRef<HTMLDivElement>(null);
	const [isExpanded, setIsExpanded] = useState(false);
	const [isOverflowing, setIsOverflowing] = useState(false);

	useLayoutEffect(() => {
		const content = contentRef.current;
		if (!content || isExpanded) return;

		const measure = () => {
			setIsOverflowing(content.scrollHeight > content.clientHeight + 1);
		};

		measure();

		const observer = new ResizeObserver(measure);
		observer.observe(content);

		return () => observer.disconnect();
	}, [description, isExpanded]);

	if (!description) return null;

	return (
		<div className={cn("flex flex-col items-start gap-1", className)}>
			<div
				ref={contentRef}
				className={cn(
					"prose prose-sm dark:prose-invert max-w-none",
					!isExpanded && "line-clamp-3",
				)}
			>
				<ReactMarkdown remarkPlugins={[remarkGfm]}>
					{description}
				</ReactMarkdown>
			</div>
			{isOverflowing && (
				<Button
					variant="link"
					size="sm"
					className="text-muted-foreground h-auto justify-start p-0"
					onClick={() => setIsExpanded((expanded) => !expanded)}
				>
					{isExpanded ? "Ler menos" : "Ler mais"}
				</Button>
			)}
		</div>
	);
}
