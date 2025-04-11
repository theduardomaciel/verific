"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

const chartData = [
	{ date: "Nov 21", total: 186, active: 80 },
	{ date: "Nov 22", total: 305, active: 200 },
	{ date: "Nov 23", total: 237, active: 120 },
	{ date: "Nov 24", total: 73, active: 190 },
	{ date: "Nov 25", total: 209, active: 130 },
	{ date: "Nov 26", total: 214, active: 140 },
];

const chartConfig = {
	total: {
		label: "Total",
		color: "var(--chart-1)",
	},
	active: {
		label: "Ativos",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

export function ParticipantsGraph() {
	return (
		<ChartContainer config={chartConfig}>
			<AreaChart accessibilityLayer data={chartData}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="date"
					tickLine={false}
					axisLine={false}
					tickMargin={12}
					tickFormatter={(value) => value}
				/>
				<YAxis
					stroke="#888888"
					fontSize={12}
					tickLine={false}
					axisLine={false}
					tickFormatter={(value) => value}
				/>
				<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
				<defs>
					<linearGradient id="filltotal" x1="0" y1="0" x2="0" y2="1">
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
					<linearGradient id="fillactive" x1="0" y1="0" x2="0" y2="1">
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
					type="natural"
					fill="url(#fillactive)"
					fillOpacity={0.4}
					stroke="var(--color-active)"
					stackId="a"
				/>
				<Area
					dataKey="total"
					type="natural"
					fill="url(#filltotal)"
					fillOpacity={0.4}
					stroke="var(--color-total)"
					stackId="a"
				/>
			</AreaChart>
		</ChartContainer>
	);
}
