"use client";

import { ParticipantsGraph } from "./participants-graph";

interface GraphSelectorProps {
	graphData: Array<{ date: string; total: number; active: number }>;
}

export function GraphSelector({ graphData }: GraphSelectorProps) {
	return (
		<div className="w-full">
			{graphData.length > 0 ? (
				<ParticipantsGraph data={graphData} />
			) : (
				<div className="flex h-full min-h-[200px] items-center justify-center">
					<p className="text-muted-foreground">
						Dados insuficientes para gerar o gráfico
					</p>
				</div>
			)}
		</div>
	);
}
