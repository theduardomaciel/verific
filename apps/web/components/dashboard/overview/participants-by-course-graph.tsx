"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const baseChartConfig = {
	count: {
		label: "Participantes",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

interface ParticipantsByCourseGraphProps {
	chartConfig?: ChartConfig;
	className?: string;
	data?: Array<{ course: string; count: number }>;
}

export function ParticipantsByCourseGraph({
	chartConfig = baseChartConfig,
	className,
	data = [],
}: ParticipantsByCourseGraphProps) {
	return (
		<ChartContainer
			config={chartConfig}
			className={cn("h-full min-h-[200px] w-full", className)}
		>
			<BarChart
				accessibilityLayer
				data={data}
				margin={{
					left: 12,
					right: 12,
				}}
			>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="course"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					tickFormatter={(value) => value}
				/>
				<YAxis
					width={30}
					stroke="#888888"
					fontSize={12}
					tickLine={false}
					axisLine={false}
					tickFormatter={(value) => value}
				/>
				<ChartTooltip
					cursor={false}
					content={<ChartTooltipContent />}
				/>
				<Bar dataKey="count" fill="var(--color-count)" radius={4} />
			</BarChart>
		</ChartContainer>
	);
}
