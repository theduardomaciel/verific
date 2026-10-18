"use client";

import { useMemo, useState } from "react";

// Icons
import { CircleOff } from "lucide-react";

import { BREAKDOWN_REGISTRATIONS_SERIES } from "@verific/api/schemas";

import { CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { useDashboard } from "@/components/dashboard/dashboard-context";

import { trpc } from "@/lib/trpc/react";

import {
	BREAKDOWN_GRAPH_TYPES,
	BreakdownGraph,
	type BreakdownGraphType,
} from "./breakdown-graph";
import { ParticipantsGraph } from "./participants-graph";

const REGISTRATIONS_VALUE = "none";

const TIME_WINDOW_OPTIONS: Array<{
	value: "24h" | "7d" | "30d" | "event" | "all";
	label: string;
}> = [
	{ value: "24h", label: "Últimas 24 horas" },
	{ value: "7d", label: "Últimos 7 dias" },
	{ value: "30d", label: "Últimos 30 dias" },
	{ value: "event", label: "Período do evento" },
	{ value: "all", label: "Histórico completo" },
];

type TimeWindow = (typeof TIME_WINDOW_OPTIONS)[number]["value"];

function EmptyState() {
	return (
		<div className="flex h-full min-h-50 items-center justify-center gap-3">
			<CircleOff size={16} className="text-muted-foreground" />
			<p className="text-muted-foreground">
				Dados insuficientes para gerar o gráfico
			</p>
		</div>
	);
}

function SelectorControl({
	label,
	value,
	onChange,
	items,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	items: Array<{ value: string; label: string }>;
}) {
	return (
		<div className="flex items-center gap-2">
			<p className="text-muted-foreground text-sm text-nowrap">{label}</p>
			<Select value={value} onValueChange={onChange}>
				<SelectTrigger className="w-fit max-w-56">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectScrollUpButton />
					{items.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
					<SelectScrollDownButton />
				</SelectContent>
			</Select>
		</div>
	);
}

export function GraphSelector() {
	const { projectId } = useDashboard();
	const [groupBy, setGroupBy] = useState<string>(REGISTRATIONS_VALUE);
	const [timeWindow, setTimeWindow] = useState<TimeWindow>("7d");
	const [graphType, setGraphType] = useState<BreakdownGraphType>("area");

	const fieldsQuery = trpc.getBreakdownFields.useQuery(
		{ projectId },
		{ staleTime: 60 * 1000, refetchOnWindowFocus: false },
	);
	const fields = useMemo(() => fieldsQuery.data ?? [], [fieldsQuery.data]);
	const selected = fields.find((field) => field.id === groupBy) ?? null;

	const seriesQuery = trpc.getBreakdownSeries.useQuery(
		{
			projectId,
			fieldId: selected ? groupBy : undefined,
			window: timeWindow,
		},
		{ staleTime: 30 * 1000, refetchOnWindowFocus: false },
	);
	const breakdown = seriesQuery.data;
	const isBreakdown = !!selected;

	// Default view: cumulative registrations ("total") + per-bucket count
	// ("active"), matching the original ParticipantsGraph shape.
	const participantsData = useMemo(() => {
		if (isBreakdown || !breakdown) return null;
		let cumulative = 0;
		return breakdown.data.map((point) => {
			const count = point.counts[BREAKDOWN_REGISTRATIONS_SERIES] ?? 0;
			cumulative += count;
			return { date: point.date, total: cumulative, active: count };
		});
	}, [breakdown, isBreakdown]);

	const isChartDataEmpty =
		!breakdown ||
		breakdown.series.length === 0 ||
		breakdown.data.length === 0;

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex flex-row flex-wrap items-center gap-4 md:justify-between">
				<CardTitle>Participantes</CardTitle>
				<div className="flex flex-wrap items-center gap-x-6 gap-y-3">
					{fields.length > 0 && (
						<SelectorControl
							label="Agrupar por"
							value={groupBy}
							onChange={setGroupBy}
							items={[
								{
									value: REGISTRATIONS_VALUE,
									label: "Inscrições",
								},
								...fields.map((field) => ({
									value: field.id,
									label: field.activityTitle
										? `${field.label} · ${field.activityTitle}`
										: field.label,
								})),
							]}
						/>
					)}
					<SelectorControl
						label="Período"
						value={timeWindow}
						onChange={(value) => setTimeWindow(value as TimeWindow)}
						items={TIME_WINDOW_OPTIONS}
					/>
					{isBreakdown && (
						<SelectorControl
							label="Tipo de gráfico"
							value={graphType}
							onChange={(value) =>
								setGraphType(value as BreakdownGraphType)
							}
							items={BREAKDOWN_GRAPH_TYPES}
						/>
					)}
				</div>
			</div>
			{seriesQuery.isPending ? (
				<Skeleton className="h-full min-h-50 w-full" />
			) : isBreakdown ? (
				isChartDataEmpty ? (
					<EmptyState />
				) : (
					<BreakdownGraph
						type={graphType}
						data={breakdown.data}
						series={breakdown.series}
						totals={breakdown.totals}
					/>
				)
			) : participantsData && !isChartDataEmpty ? (
				<ParticipantsGraph data={participantsData} />
			) : (
				<EmptyState />
			)}
		</div>
	);
}
