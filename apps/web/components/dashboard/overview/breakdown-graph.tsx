"use client";

import { useMemo } from "react";

import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	XAxis,
	YAxis,
} from "recharts";

import { BREAKDOWN_OTHER_SERIES, tagColors } from "@verific/api/schemas";

import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

import { cn } from "@/lib/utils";

export type BreakdownGraphType =
	| "area"
	| "bar_stacked"
	| "bar_grouped"
	| "donut";

export const BREAKDOWN_GRAPH_TYPES: Array<{
	value: BreakdownGraphType;
	label: string;
}> = [
	{ value: "area", label: "Área empilhada" },
	{ value: "bar_stacked", label: "Barras empilhadas" },
	{ value: "bar_grouped", label: "Barras agrupadas" },
	{ value: "donut", label: "Proporção (rosca)" },
];

interface AliasedSeries {
	label: string;
	key: string;
	color: string;
}

interface BreakdownPoint {
	date: string;
	counts: Record<string, number>;
}

interface BreakdownGraphProps {
	className?: string;
	type?: BreakdownGraphType;
	data: BreakdownPoint[];
	series: string[];
	totals?: Record<string, number>;
}

/**
 * Options are human-readable labels ("Ciência da Computação"), but the
 * shadcn chart config only injects valid CSS custom property names — so each
 * rendered series gets an `s0`, `s1`… alias used as the recharts dataKey /
 * config key, and the label lives in the config (tooltip + legend resolve
 * it back).
 */
function useAliasedSeries(series: string[]) {
	return useMemo<AliasedSeries[]>(
		() =>
			series.map((label, index) => ({
				label,
				key: `s${index}`,
				color:
					label === BREAKDOWN_OTHER_SERIES
						? "var(--muted-foreground)"
						: (tagColors[index % tagColors.length] ?? "#888888"),
			})),
		[series],
	);
}

function useChartConfig(aliasedSeries: AliasedSeries[]) {
	return useMemo(
		() =>
			aliasedSeries.reduce<ChartConfig>((config, item) => {
				config[item.key] = { label: item.label, color: item.color };
				return config;
			}, {}),
		[aliasedSeries],
	);
}

const Axis = () => (
	<>
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
			allowDecimals={false}
			tickFormatter={(value) => value}
		/>
	</>
);

const Tooltip = () => (
	<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
);

const Legend = ({ nameKey }: { nameKey?: string }) => (
	<ChartLegend
		content={
			<ChartLegendContent
				className="flex-wrap justify-start gap-x-4 gap-y-1"
				nameKey={nameKey}
			/>
		}
	/>
);

export function BreakdownGraph({
	className,
	type = "area",
	data,
	series,
	totals,
}: BreakdownGraphProps) {
	const aliasedSeries = useAliasedSeries(series);
	const chartConfig = useChartConfig(aliasedSeries);

	const aliasedData = useMemo(
		() =>
			data.map((point) => {
				const row: Record<string, string | number> = {
					date: point.date,
				};
				for (const item of aliasedSeries) {
					row[item.key] = point.counts[item.label] ?? 0;
				}
				return row;
			}),
		[aliasedSeries, data],
	);

	if (type === "donut") {
		// Totals across the whole window: the distribution of answers.
		const pieData = aliasedSeries
			.map((item) => ({
				name: item.key,
				value: totals?.[item.label] ?? 0,
			}))
			.filter((entry) => entry.value > 0);

		if (pieData.length === 0) {
			return (
				<div className="flex h-full min-h-[200px] items-center justify-center">
					<p className="text-muted-foreground">
						Dados insuficientes para gerar o gráfico
					</p>
				</div>
			);
		}

		return (
			<ChartContainer
				config={chartConfig}
				className={cn("mx-auto aspect-square max-h-[240px]", className)}
			>
				<PieChart>
					<ChartTooltip
						cursor={false}
						content={
							<ChartTooltipContent hideLabel nameKey="name" />
						}
					/>
					<Pie
						data={pieData}
						dataKey="value"
						nameKey="name"
						innerRadius={50}
						outerRadius={80}
						paddingAngle={2}
					>
						{pieData.map((entry) => (
							<Cell
								key={entry.name}
								fill={`var(--color-${entry.name})`}
							/>
						))}
					</Pie>
					<Legend nameKey="name" />
				</PieChart>
			</ChartContainer>
		);
	}

	if (type === "bar_stacked" || type === "bar_grouped") {
		const stacked = type === "bar_stacked";
		return (
			<ChartContainer
				config={chartConfig}
				className={cn("h-full min-h-[200px] w-full", className)}
			>
				<BarChart
					accessibilityLayer
					data={aliasedData}
					margin={{ left: 12, right: 12 }}
				>
					<Axis />
					<Tooltip />
					<Legend />
					{aliasedSeries.map((item) => (
						<Bar
							key={item.key}
							dataKey={item.key}
							stackId={stacked ? "breakdown" : undefined}
							fill={`var(--color-${item.key})`}
							fillOpacity={0.85}
							radius={stacked ? undefined : [3, 3, 0, 0]}
						/>
					))}
				</BarChart>
			</ChartContainer>
		);
	}

	return (
		<ChartContainer
			config={chartConfig}
			className={cn("h-full min-h-[200px] w-full", className)}
		>
			<AreaChart
				accessibilityLayer
				data={aliasedData}
				margin={{ left: 12, right: 12 }}
			>
				<Axis />
				<Tooltip />
				<Legend />
				{aliasedSeries.map((item) => (
					<Area
						key={item.key}
						dataKey={item.key}
						stackId="breakdown"
						type="linear"
						fill={`var(--color-${item.key})`}
						fillOpacity={0.6}
						stroke={`var(--color-${item.key})`}
					/>
				))}
			</AreaChart>
		</ChartContainer>
	);
}
