"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParticipantsGraph } from "./participants-graph";
import { ParticipantsByCourseGraph } from "./participants-by-course-graph";

interface GraphSelectorProps {
	graphData: Array<{ date: string; total: number; active: number }>;
	coursesData: Array<{ course: string; count: number }>;
}

export function GraphSelector({ graphData, coursesData }: GraphSelectorProps) {
	const [selectedGraph, setSelectedGraph] = useState("evolution");

	return (
		<Tabs
			value={selectedGraph}
			onValueChange={setSelectedGraph}
			className="w-full"
		>
			<TabsList className="grid w-full grid-cols-2">
				<TabsTrigger value="evolution">Evolução Temporal</TabsTrigger>
				<TabsTrigger value="course">Por Curso</TabsTrigger>
			</TabsList>
			<TabsContent value="evolution" className="mt-4 w-full">
				{graphData.length > 0 ? (
					<ParticipantsGraph data={graphData} />
				) : (
					<div className="flex h-full min-h-[200px] items-center justify-center">
						<p className="text-muted-foreground">
							Dados insuficientes para gerar o gráfico
						</p>
					</div>
				)}
			</TabsContent>
			<TabsContent value="course" className="mt-4 w-full">
				{coursesData.length > 0 ? (
					<ParticipantsByCourseGraph data={coursesData} />
				) : (
					<div className="flex h-full min-h-[200px] items-center justify-center">
						<p className="text-muted-foreground">
							Dados insuficientes para gerar o gráfico
						</p>
					</div>
				)}
			</TabsContent>
		</Tabs>
	);
}
