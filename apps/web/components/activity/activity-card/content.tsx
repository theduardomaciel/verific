"use client";

import { InfoIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { RouterOutput } from "@verific/api";
import { activityCategoryLabels } from "@verific/drizzle/schema";

import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

import { getEffectiveTolerance } from "@/lib/activity-conditions";

import { ActivitySpeakers } from "./speakers";
import { ActivityCardTags } from "./tags";

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

	// A tolerância só vale com fila: sem fila, o aviso some mesmo com
	// valor obsoleto salvo.
	const effectiveTolerance = getEffectiveTolerance(activity);

	return (
		<div className="flex w-full flex-col items-center justify-center gap-4">
			<div className="flex flex-col items-center justify-center gap-3">
				<Badge className="w-fit">
					{activityCategoryLabels[activity.category]}
				</Badge>
				<div>
					<h2 className="mb-2 text-xl font-bold">{activity.name}</h2>
					<div className="prose prose-sm dark:prose-invert max-w-none text-left">
						<ReactMarkdown remarkPlugins={[remarkGfm]}>
							{activity.description || ""}
						</ReactMarkdown>
					</div>
				</div>
			</div>

			{speakers && speakers.length > 0 && (
				<ActivitySpeakers
					speakers={speakers}
					projectUrl={
						"project" in activity
							? (activity.project?.url ?? undefined)
							: undefined
					}
				/>
			)}

			<ActivityCardTags tagsClassName="bg-muted" activity={activity} />

			{effectiveTolerance ? (
				<div className="bg-muted/50 flex flex-row items-center justify-between gap-3 rounded-sm p-4 text-sm select-none">
					<span className="text-muted-foreground text-sm">
						Esta atividade tem{" "}
						<strong>tolerância de {effectiveTolerance} min</strong>.
					</span>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<InfoIcon className="mt-0.5" size={16} />
							</TooltipTrigger>
							<TooltipContent className="max-w-88">
								<p>
									Caso não haja confirmação de sua presença em{" "}
									{effectiveTolerance}m a partir do início da
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
