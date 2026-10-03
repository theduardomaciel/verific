"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDownIcon, LockOpenIcon } from "lucide-react";

import { trpc } from "@/lib/trpc/react";
import type { RouterOutput } from "@verific/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { activityCategoryLabels } from "@verific/drizzle/enum/category";
import { getFirstSessionStart } from "@/lib/date";

type ReleasableActivity = RouterOutput["getReleasableActivities"][number];
type GroupBy = "day" | "category" | "tag";

interface Group {
	key: string;
	label: string;
	items: ReleasableActivity[];
}

interface ReleaseRegistrationsDialogProps {
	projectId: string;
}

const NO_TAG_KEY = "__no-tag__";

function capitalize(text: string) {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatTime(date: Date | string) {
	return new Date(date).toLocaleTimeString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatShortDate(date: Date | string) {
	return new Date(date).toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
	});
}

function buildGroups(
	activities: ReleasableActivity[],
	groupBy: GroupBy,
): Group[] {
	const sorted = [...activities].sort(
		(a, b) =>
			(getFirstSessionStart(a.sessions)?.getTime() ?? 0) -
			(getFirstSessionStart(b.sessions)?.getTime() ?? 0),
	);

	const map = new Map<string, Group>();

	function add(key: string, label: string, activity: ReleasableActivity) {
		const group = map.get(key) ?? { key, label, items: [] };
		group.items.push(activity);
		map.set(key, group);
	}

	for (const activity of sorted) {
		if (groupBy === "day") {
			const firstStart = getFirstSessionStart(activity.sessions);
			const date = firstStart ? new Date(firstStart) : new Date();
			add(
				date.toLocaleDateString("sv-SE"), // yyyy-mm-dd, local time
				capitalize(
					date.toLocaleDateString("pt-BR", {
						weekday: "long",
						day: "numeric",
						month: "long",
					}),
				),
				activity,
			);
		} else if (groupBy === "category") {
			add(
				activity.category,
				activityCategoryLabels[
					activity.category as keyof typeof activityCategoryLabels
				] ?? activity.category,
				activity,
			);
		} else if (activity.tags.length === 0) {
			add(NO_TAG_KEY, "Sem tag", activity);
		} else {
			// An activity can have several tags: it shows up under each one
			for (const tag of activity.tags) add(tag.id, tag.name, activity);
		}
	}

	const groups = [...map.values()];
	if (groupBy !== "day") {
		groups.sort((a, b) => {
			if (a.key === NO_TAG_KEY) return 1;
			if (b.key === NO_TAG_KEY) return -1;
			return a.label.localeCompare(b.label, "pt-BR");
		});
	}
	return groups;
}

export function ReleaseRegistrationsDialog({
	projectId,
}: ReleaseRegistrationsDialogProps) {
	const [open, setOpen] = useState(false);
	const [groupBy, setGroupBy] = useState<GroupBy>("day");
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const utils = trpc.useUtils();

	const { data, isPending, isError } = trpc.getReleasableActivities.useQuery(
		{ projectId },
		{ enabled: open },
	);

	const mutation = trpc.setActivitiesRegistration.useMutation({
		onSuccess: async (_, variables) => {
			await utils.getActivities.invalidate();
			await utils.getReleasableActivities.invalidate();
			const count = variables.activityIds.length;
			toast.success(
				count === 1
					? "1 atividade liberada para inscrição!"
					: `${count} atividades liberadas para inscrição!`,
			);
			setOpen(false);
		},
		onError: (e) => toast.error(e.message),
	});

	const activities = useMemo(() => data ?? [], [data]);
	const groups = useMemo(
		() => buildGroups(activities, groupBy),
		[activities, groupBy],
	);

	const selectedWithoutLimit = activities.filter(
		(a) => selected.has(a.id) && !a.participantsLimit,
	).length;

	function handleOpenChange(next: boolean) {
		setOpen(next);
		if (next) {
			setSelected(new Set());
			setGroupBy("day");
		}
	}

	function toggleActivity(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleGroup(group: Group) {
		setSelected((prev) => {
			const next = new Set(prev);
			const allSelected = group.items.every((a) => next.has(a.id));
			for (const a of group.items) {
				if (allSelected) next.delete(a.id);
				else next.add(a.id);
			}
			return next;
		});
	}

	function submit() {
		mutation.mutate({
			projectId,
			activityIds: [...selected],
			isRegistrationOpen: true,
		});
	}

	const count = selected.size;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="outline" size="lg" className="w-full">
					<LockOpenIcon className="mr-2 h-4 w-4" />
					Liberar inscrições
				</Button>
			</DialogTrigger>
			<DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-[560px]">
				<DialogHeader>
					<DialogTitle>Liberar inscrições</DialogTitle>
					<DialogDescription>
						Escolha quais atividades abrir para inscrição. Só
						aparecem atividades que ainda não terminaram e estão com
						inscrições fechadas.
					</DialogDescription>
				</DialogHeader>

				<Tabs
					value={groupBy}
					onValueChange={(value) => setGroupBy(value as GroupBy)}
				>
					<TabsList className="w-full">
						<TabsTrigger value="day" className="flex-1">
							Por dia
						</TabsTrigger>
						<TabsTrigger value="category" className="flex-1">
							Por categoria
						</TabsTrigger>
						<TabsTrigger value="tag" className="flex-1">
							Por tag
						</TabsTrigger>
					</TabsList>
				</Tabs>

				{groupBy === "tag" && (
					<p className="text-muted-foreground -mt-2 text-xs">
						Atividades com mais de uma tag aparecem em cada uma
						delas.
					</p>
				)}

				<div className="-mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1">
					{isPending ? (
						<>
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
						</>
					) : isError ? (
						<p className="text-muted-foreground py-6 text-center text-sm">
							Não foi possível carregar as atividades.
						</p>
					) : groups.length === 0 ? (
						<p className="text-muted-foreground py-6 text-center text-sm">
							Nenhuma atividade com inscrições fechadas.
						</p>
					) : (
						groups.map((group) => {
							const selectedInGroup = group.items.filter((a) =>
								selected.has(a.id),
							).length;
							const groupState =
								selectedInGroup === 0
									? false
									: selectedInGroup === group.items.length
										? true
										: "indeterminate";

							return (
								<Collapsible
									key={group.key}
									defaultOpen
									className="rounded-lg border"
								>
									<div className="flex items-center gap-3 px-4 py-3">
										<Checkbox
											checked={groupState}
											onCheckedChange={() =>
												toggleGroup(group)
											}
											aria-label={`Selecionar ${group.label}`}
										/>
										<CollapsibleTrigger asChild>
											<button
												type="button"
												className="group flex flex-1 items-center justify-between gap-2 text-left"
											>
												<span className="text-sm font-medium">
													{group.label}
												</span>
												<span className="text-muted-foreground flex items-center gap-2 text-xs">
													{group.items.length === 1
														? "1 fechada"
														: `${group.items.length} fechadas`}
													<ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
												</span>
											</button>
										</CollapsibleTrigger>
									</div>
									<CollapsibleContent className="flex flex-col border-t">
										{group.items.map((activity) => (
											<label
												key={activity.id}
												className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 px-4 py-2.5"
											>
												<Checkbox
													checked={selected.has(
														activity.id,
													)}
													onCheckedChange={() =>
														toggleActivity(
															activity.id,
														)
													}
												/>
												<span className="flex-1 truncate text-sm">
													{activity.name}
												</span>
												{!activity.participantsLimit && (
													<Badge
														variant="outline"
														className="shrink-0 text-xs"
													>
														Sem limite
													</Badge>
												)}
												<span className="text-muted-foreground shrink-0 text-xs tabular-nums">
													{groupBy === "day"
														? (() => {
																const first =
																	getFirstSessionStart(
																		activity.sessions,
																	);
																return first
																	? formatTime(
																			first,
																		)
																	: "";
															})()
														: (() => {
																const first =
																	getFirstSessionStart(
																		activity.sessions,
																	);
																return first
																	? formatShortDate(
																			first,
																		)
																	: "";
															})()}
												</span>
											</label>
										))}
									</CollapsibleContent>
								</Collapsible>
							);
						})
					)}
				</div>

				{selectedWithoutLimit > 0 && (
					<p className="text-muted-foreground bg-muted/50 rounded-md px-3 py-2 text-xs">
						{selectedWithoutLimit === 1
							? "1 atividade selecionada está sem limite de vagas."
							: `${selectedWithoutLimit} atividades selecionadas estão sem limite de vagas.`}{" "}
						Confirme a capacidade das salas antes de liberar.
					</p>
				)}

				<DialogFooter className="gap-2 sm:gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => setOpen(false)}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						disabled={count === 0 || mutation.isPending}
						onClick={submit}
					>
						{mutation.isPending
							? "Liberando..."
							: count === 0
								? "Liberar inscrições"
								: count === 1
									? "Liberar 1 atividade"
									: `Liberar ${count} atividades`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
