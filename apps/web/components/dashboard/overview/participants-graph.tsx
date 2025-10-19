"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const chartData = [
	{ date: "Nov 21", total: 186, active: 80 },
	{ date: "Nov 22", total: 305, active: 200 },
	{ date: "Nov 23", total: 237, active: 120 },
	{ date: "Nov 24", total: 73, active: 190 },
	{ date: "Nov 25", total: 209, active: 130 },
	{ date: "Nov 26", total: 214, active: 140 },
];

const baseChartConfig = {
	total: {
		label: "Total",
		color: "var(--chart-1)",
	},
	active: {
		label: "Ativos",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

interface ParticipantsGraphProps {
	chartConfig?: ChartConfig;
	className?: string;
	data?: Array<{ date: string; total: number; active: number }>;
}

export function ParticipantsGraph({
	chartConfig = baseChartConfig,
	className,
	data = chartData,
}: ParticipantsGraphProps) {
	return (
		<ChartContainer
			config={chartConfig}
			className={cn("h-full min-h-[200px] w-full", className)}
		>
			<AreaChart
				accessibilityLayer
				data={data}
				margin={{
					left: 12,
					right: 12,
				}}
			>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="date"
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
					/* domain={[0, "dataMax"]} */
				/>
				<ChartTooltip
					cursor={false}
					content={<ChartTooltipContent />}
				/>
				<defs>
					<linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
						<stop
							offset="5%"
							stopColor="var(--color-total)"
							stopOpacity={0.8}
						/>
						<stop
							offset="95%"
							stopColor="var(--color-total)"
							stopOpacity={0.1}
						/>
					</linearGradient>
					<linearGradient id="fillActive" x1="0" y1="0" x2="0" y2="1">
						<stop
							offset="5%"
							stopColor="var(--color-active)"
							stopOpacity={0.8}
						/>
						<stop
							offset="95%"
							stopColor="var(--color-active)"
							stopOpacity={0.1}
						/>
					</linearGradient>
				</defs>
				<Area
					dataKey="active"
					type="linear"
					fill="url(#fillActive)"
					fillOpacity={0.4}
					stroke="var(--color-active)"
				/>
				<Area
					dataKey="total"
					type="linear"
					fill="url(#fillTotal)"
					fillOpacity={0.4}
					stroke="var(--color-total)"
				/>
			</AreaChart>
		</ChartContainer>
	);
}
