"use client";

import { useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerScrollArea,
	DrawerTitle,
} from "@/components/ui/drawer";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";

import { ActivityDetailsContent } from "@/components/activity/activity-card/content";

import { useMediaQuery } from "@/hooks/use-media-query";

interface ExpandableDescriptionProps {
	activity: any; // TODO: Use proper type from API
}

export function ExpandableDescription({
	activity,
}: ExpandableDescriptionProps) {
	const [showDetailsDialog, setShowDetailsDialog] = useState(false);
	const isDesktop = useMediaQuery("(min-width: 768px)");

	const hasMoreDescription = activity.description.length > 120;

	return (
		<>
			<div className="flex flex-col gap-2">
				<div className="prose prose-sm dark:prose-invert text-muted-foreground line-clamp-3 max-w-none text-sm">
					<ReactMarkdown remarkPlugins={[remarkGfm]}>
						{activity.description}
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
					<SheetContent className="gap-0 sm:max-w-[425px]">
						<SheetHeader className="w-full shrink-0 items-center justify-center border-b text-center">
							<SheetTitle className="w-full text-center">
								Detalhes da Atividade
							</SheetTitle>
						</SheetHeader>
						<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-8 py-4 text-center">
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
						<DrawerHeader className="w-full border-b pb-4 text-center">
							<DrawerTitle>Detalhes da Atividade</DrawerTitle>
						</DrawerHeader>
						<DrawerScrollArea>
							<div className="px-6 py-4">
								<ActivityDetailsContent activity={activity} />
							</div>
						</DrawerScrollArea>
					</DrawerContent>
				</Drawer>
			)}
		</>
	);
}
