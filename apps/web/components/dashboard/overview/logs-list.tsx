"use client";

import { useEffect, useRef, useState } from "react";

import {
	AlertTriangle,
	Ban,
	CalendarCheck,
	CalendarX,
	CheckCircle2,
	Clock,
	ListOrdered,
	LogOut,
	Pencil,
	ScanLine,
	Search,
	UserCog,
	UserMinus,
	UserPlus,
	UserRoundX,
	XCircle,
} from "lucide-react";

import type { RouterOutput } from "@verific/api";
import type { EventLogType } from "@verific/drizzle/schema";
import { formatInstant } from "@verific/drizzle/time";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { useDashboard } from "@/components/dashboard/dashboard-context";
import { useEventTimeZone } from "@/components/event-time-zone";

import { useDebounce } from "@/hooks/use-debounce";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

type LogEntry = RouterOutput["getActivityLog"]["entries"][number];

const TYPE_META: Record<
	EventLogType,
	{ label: string; icon: typeof UserPlus }
> = {
	"activity.created": { label: "Atividade criada", icon: CalendarCheck },
	"activity.updated": { label: "Atividade editada", icon: Pencil },
	"activity.cancelled": { label: "Atividade cancelada", icon: Ban },
	"activity.monitor_added": { label: "Monitor adicionado", icon: UserCog },
	"enrollment.created": { label: "Inscrição em atividade", icon: UserPlus },
	"enrollment.overbooked": {
		label: "Inscrição acima da capacidade",
		icon: AlertTriangle,
	},
	"enrollment.cancelled": { label: "Inscrição cancelada", icon: UserMinus },
	"enrollment.removed": { label: "Removido da atividade", icon: UserRoundX },
	"enrollment.no_show_released": {
		label: "Vaga liberada por ausência",
		icon: CalendarX,
	},
	"waitlist.joined": { label: "Entrou na fila", icon: ListOrdered },
	"waitlist.left": { label: "Saiu da fila", icon: LogOut },
	"waitlist.offered": { label: "Oferta de vaga", icon: Clock },
	"waitlist.confirmed": { label: "Vaga confirmada", icon: CheckCircle2 },
	"waitlist.promoted": { label: "Promovido da fila", icon: CheckCircle2 },
	"waitlist.expired": { label: "Oferta expirada", icon: XCircle },
	"waitlist.removed": { label: "Removido da fila", icon: UserRoundX },
	"waitlist.revoked": { label: "Oferta revogada", icon: XCircle },
	"session.checkin": { label: "Credenciado na sessão", icon: CalendarCheck },
	"session.checkout": { label: "Saída de sessão", icon: LogOut },
	"reception.checkin": { label: "Check-in na recepção", icon: ScanLine },
	"participant.joined_event": {
		label: "Inscrição no evento",
		icon: UserPlus,
	},
	"participant.removed_event": {
		label: "Removido do evento",
		icon: UserRoundX,
	},
};

const FILTER_GROUPS: Array<{ label: string; types: EventLogType[] }> = [
	{
		label: "Inscrições",
		types: [
			"enrollment.created",
			"enrollment.cancelled",
			"enrollment.removed",
			"enrollment.overbooked",
			"enrollment.no_show_released",
		],
	},
	{
		label: "Fila",
		types: [
			"waitlist.joined",
			"waitlist.left",
			"waitlist.offered",
			"waitlist.confirmed",
			"waitlist.promoted",
			"waitlist.expired",
			"waitlist.removed",
			"waitlist.revoked",
		],
	},
	{
		label: "Check-ins",
		types: ["session.checkin", "session.checkout", "reception.checkin"],
	},
	{
		label: "Atividades",
		types: [
			"activity.created",
			"activity.updated",
			"activity.cancelled",
			"activity.monitor_added",
		],
	},
	{
		label: "Evento",
		types: ["participant.joined_event", "participant.removed_event"],
	},
];

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
	day: "2-digit",
	month: "short",
	hour: "2-digit",
	minute: "2-digit",
};

export function LogsList({ className }: { className?: string }) {
	const { projectId } = useDashboard();
	const [search, setSearch] = useState("");
	const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
	const debouncedSearch = useDebounce(search.trim(), 300);

	const types = selectedGroups.flatMap(
		(group) =>
			FILTER_GROUPS.find((item) => item.label === group)?.types ?? [],
	);

	const query = trpc.getActivityLog.useInfiniteQuery(
		{
			projectId,
			search: debouncedSearch || undefined,
			types: types.length > 0 ? types : undefined,
		},
		{
			staleTime: 30 * 1000,
			refetchOnWindowFocus: true,
			getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
		},
	);

	const entries = query.data?.pages.flatMap((page) => page.entries) ?? [];

	const sentinelRef = useRef<HTMLDivElement>(null);
	const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
	useEffect(() => {
		const target = sentinelRef.current;
		if (!target) return;
		const observer = new IntersectionObserver(
			(observed) => {
				if (
					observed[0]?.isIntersecting &&
					hasNextPage &&
					!isFetchingNextPage
				) {
					void fetchNextPage();
				}
			},
			{ threshold: 0.1 },
		);
		observer.observe(target);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	function toggleGroup(label: string) {
		setSelectedGroups((prev) =>
			prev.includes(label)
				? prev.filter((item) => item !== label)
				: [...prev, label],
		);
	}

	return (
		<div
			className={cn(
				"flex min-h-0 flex-1 flex-col rounded-lg border pt-6",
				className,
			)}
		>
			<div className="flex shrink-0 flex-col gap-3">
				<h2 className="px-6 text-base font-medium">Logs do evento</h2>
				<div className="px-6">
					<div className="relative w-full">
						<Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
						<Input
							className="w-full pl-9"
							placeholder="Pesquisar por participante, atividade ou autor"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
						/>
					</div>
				</div>
				<div className="flex flex-wrap gap-2 border-b px-6 pb-3">
					{FILTER_GROUPS.map((group) => {
						const active = selectedGroups.includes(group.label);
						return (
							<Badge
								key={group.label}
								onClick={() => toggleGroup(group.label)}
								aria-pressed={active}
								className={cn(
									"cursor-pointer px-2.5 py-2.5",
									active
										? "bg-primary text-primary-foreground"
										: "bg-muted text-muted-foreground",
								)}
							>
								{group.label}
							</Badge>
						);
					})}
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto">
				{query.isPending ? (
					<p className="text-muted-foreground pt-6 text-center text-sm">
						Carregando log...
					</p>
				) : query.isError ? (
					<p className="text-muted-foreground pt-6 text-center text-sm">
						Não foi possível carregar o log.
					</p>
				) : entries.length === 0 ? (
					<p className="text-muted-foreground pt-6 text-center text-sm">
						Nenhum registro encontrado.
					</p>
				) : (
					<ul className="divide-border flex flex-col divide-y">
						{entries.map((entry) => (
							<LogRow key={entry.id} entry={entry} />
						))}
					</ul>
				)}
				<div ref={sentinelRef} className="h-1 w-full" />
				{isFetchingNextPage ? (
					<p className="text-muted-foreground py-3 text-center text-xs">
						Carregando mais...
					</p>
				) : null}
			</div>
		</div>
	);
}

function LogRow({ entry }: { entry: LogEntry }) {
	const timeZone = useEventTimeZone();
	const meta = TYPE_META[entry.type];
	const Icon = meta.icon;
	return (
		<li className="flex items-center gap-3 px-6 py-3">
			<span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
				<Icon className="size-4" />
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="text-sm font-semibold">
					{entry.participantName ?? meta.label}
				</span>
				<span className="text-muted-foreground truncate text-sm">
					{entry.activityName
						? `${meta.label} · ${entry.activityName}`
						: meta.label}
					{entry.actorName ? ` · por ${entry.actorName}` : null}
				</span>
				{entry.detail ? (
					<span className="text-muted-foreground text-xs">
						{entry.detail}
					</span>
				) : null}
			</div>
			<span className="text-muted-foreground shrink-0 text-xs tabular-nums">
				{formatInstant(entry.at, timeZone, DATE_FORMAT)}
			</span>
		</li>
	);
}
