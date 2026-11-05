"use client";

import { Download } from "lucide-react";

import { formatInstant } from "@verific/drizzle/time";

import { useEventTimeZone } from "@/components/event-time-zone";

import { Button } from "../ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip";

interface Props {
	participants: Array<{
		name: string;
		email: string;
		createdAt?: Date | null;
	}>;
}

export function ExportParticipantsButton({ participants }: Props) {
	const timeZone = useEventTimeZone();
	function participantsToCsv() {
		const headers = ["Nome", "Email", "Inscrito em"];
		const rows = participants.map((participant) => [
			participant.name,
			participant.email,
			participant.createdAt
				? formatInstant(participant.createdAt, timeZone, {
						day: "2-digit",
						month: "2-digit",
						year: "numeric",
					})
				: "",
		]);
		const csvContent =
			"data:text/csv;charset=utf-8," +
			[headers, ...rows].map((e) => e.join(",")).join("\n");
		return encodeURI(csvContent);
	}

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						onClick={() => {
							const csvUri = participantsToCsv();
							const link = document.createElement("a");
							link.setAttribute("href", csvUri);
							link.setAttribute("download", "participants.csv");
							document.body.appendChild(link);
							link.click();
							document.body.removeChild(link);
						}}
						size={"icon"}
					>
						<Download className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					Baixar lista de participantes em CSV
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
