"use client";

import { RouterOutput } from "@verific/api";
import { activityCategoryLabels } from "@verific/drizzle/schema";
import { Badge } from "@/components/ui/badge";
import { InfoIcon } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ActivitySpeakers } from "./speakers";
import { ActivityCardTags } from "./tags";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Activity =
	| RouterOutput["getActivity"]["activity"]
	| RouterOutput["getActivities"]["activities"][number];

interface ActivityDetailsContentProps {
	activity: Activity;
}

export function ActivityDetailsContent({
	activity,
}: ActivityDetailsContentProps) {
	// Handle both types of activity objects - safely access speakers
	let speakers: any[] = [];
	if ("speakerOnActivity" in activity && activity.speakerOnActivity) {
		speakers = activity.speakerOnActivity.map((s) => s.speaker);
	} else if ("speakers" in activity && activity.speakers) {
		speakers = activity.speakers;
	}

	return (
		<div className="flex w-full flex-col items-center justify-center gap-4">
			<div className="flex flex-col items-center justify-center gap-3">
				<Badge className="w-fit">
					{activityCategoryLabels[activity.category]}
				</Badge>
				<div>
					<h2 className="mb-2 text-xl font-bold">{activity.name}</h2>
					<div className="prose prose-sm dark:prose-invert max-w-none">
						<ReactMarkdown remarkPlugins={[remarkGfm]}>
							{activity.description || ""}
						</ReactMarkdown>
					</div>
				</div>
			</div>

			{speakers && speakers.length > 0 && (
				<ActivitySpeakers speakers={speakers} />
			)}

			<ActivityCardTags tagsClassName="bg-muted" activity={activity} />

			{activity?.tolerance ? (
				<div className="bg-muted/50 flex flex-row items-center justify-between gap-3 rounded-sm p-4 text-sm select-none">
					<span className="text-muted-foreground text-sm">
						Este evento possui <strong>fila de espera</strong>.
					</span>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<InfoIcon className="mt-0.5" size={16} />
							</TooltipTrigger>
							<TooltipContent className="max-w-[22rem]">
								<p>
									Caso não haja confirmação de sua presença em{" "}
									{activity.tolerance}m a partir do início da
									atividade, sua vaga será cedida a outra
									pessoa.
								</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			) : null}
		</div>
	);
}
