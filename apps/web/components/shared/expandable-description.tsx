"use client";

import { useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Components
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ActivityDetailsContent } from "@/components/activity/activity-card/content";

interface ExpandableDescriptionProps {
	activity: any; // TODO: Use proper type from API
}

export function ExpandableDescription({
	activity,
}: ExpandableDescriptionProps) {
	const [showDetailsDialog, setShowDetailsDialog] = useState(false);
	const isDesktop = useMediaQuery("(min-width: 768px)");

	const description = activity.description || "";

	const getTruncatedDescription = (text: string) => {
		if (!text) return "";
		const firstDotIndex = text.indexOf(".");
		if (firstDotIndex !== -1) {
			return text.substring(0, firstDotIndex + 1);
		}
		return text.length > 120 ? text.substring(0, 120) + "..." : text;
	};

	const hasMoreDescription =
		description &&
		(description.indexOf(".") !== -1 || description.length > 120);

	const truncatedDescription = getTruncatedDescription(description);

	return (
		<>
			<div className="flex flex-col gap-2">
				<div className="prose prose-sm dark:prose-invert text-muted-foreground max-w-none text-sm">
					<ReactMarkdown remarkPlugins={[remarkGfm]}>
						{truncatedDescription}
					</ReactMarkdown>
				</div>
				{hasMoreDescription && (
					<Button
						variant="link"
						size="sm"
						className="text-secondary h-auto justify-start p-0"
						onClick={() => setShowDetailsDialog(true)}
					>
						Ler mais
					</Button>
				)}
			</div>

			{/* Details Dialog (Desktop) */}
			{isDesktop && (
				<Sheet
					open={showDetailsDialog}
					onOpenChange={setShowDetailsDialog}
				>
					<SheetContent className="sm:max-w-[425px]">
						<SheetHeader className="w-full items-center justify-center text-center">
							<SheetTitle className="w-full text-center">
								Detalhes da Atividade
							</SheetTitle>
						</SheetHeader>
						<div className="flex px-8 py-4 text-center">
							<ActivityDetailsContent activity={activity} />
						</div>
					</SheetContent>
				</Sheet>
			)}

			{/* Details Drawer (Mobile) */}
			{!isDesktop && (
				<Drawer
					open={showDetailsDialog}
					onOpenChange={setShowDetailsDialog}
				>
					<DrawerContent>
						<DrawerHeader className="mb-4 w-full border-b pb-4 text-center">
							<DrawerTitle>Detalhes da Atividade</DrawerTitle>
						</DrawerHeader>
						<div className="overflow-y-scroll px-6 pb-4">
							<ActivityDetailsContent activity={activity} />
						</div>
					</DrawerContent>
				</Drawer>
			)}
		</>
	);
}
