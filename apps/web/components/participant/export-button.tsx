"use client";

import { Download } from "lucide-react";
import { Button } from "../ui/button";

interface Props {
	participants: Array<{
		name: string;
		email: string;
		createdAt?: Date | null;
	}>;
}

export function ExportParticipantsButton({ participants }: Props) {
	function participantsToCsv() {
		const headers = ["Nome", "Email", "Inscrito em"];
		const rows = participants.map((participant) => [
			participant.name,
			participant.email,
			participant.createdAt?.toLocaleDateString() || "",
		]);
		const csvContent =
			"data:text/csv;charset=utf-8," +
			[headers, ...rows].map((e) => e.join(",")).join("\n");
		return encodeURI(csvContent);
	}

	return (
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
	);
}
