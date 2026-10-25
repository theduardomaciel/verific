"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { RouterOutput } from "@verific/api";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import { WaitlistStatusBadge } from "./waitlist-status-badge";

type WaitlistData = NonNullable<RouterOutput["getActivityWaitlist"]>;

interface WaitlistListProps {
	activityId: string;
	waitlistData: WaitlistData;
	promote: (args: {
		activityId: string;
		participantIds: string[];
	}) => Promise<unknown>;
	remove: (args: {
		activityId: string;
		participantId: string;
	}) => Promise<unknown>;
	isPromoting: boolean;
	isRemoving: boolean;
}

// Position | Participant | Status | Joined | Actions
// Every column except the participant one has a FIXED width, so the header
// and each row (separate grids) always resolve to identical tracks.
// Below `lg` the rows stack as cards instead.
const ROW_GRID =
	"lg:grid lg:grid-cols-[2.5rem_minmax(0,1fr)_7rem_9rem_15rem] lg:items-center lg:gap-3";

export function WaitlistList({
	activityId,
	waitlistData,
	promote,
	remove,
	isPromoting,
	isRemoving,
}: WaitlistListProps) {
	const { participantsLimit, enrolled, freeSeats, entries } = waitlistData;

	const waitingEntries = entries.filter((e) => e.status === "waiting");
	const offeredEntries = entries.filter((e) => e.status === "offered");

	const canPromote = freeSeats != null && freeSeats > 0;

	return (
		<div className="flex w-full min-w-0 flex-col gap-4">
			{/* Summary Cards */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
				<div className="bg-card flex min-w-0 flex-col gap-1 rounded-lg border p-4">
					<p className="text-muted-foreground text-sm font-medium">
						Limite de vagas
					</p>
					<p className="text-2xl font-bold">
						{participantsLimit ?? "Sem limite"}
					</p>
				</div>
				<div className="bg-card flex min-w-0 flex-col gap-1 rounded-lg border p-4">
					<p className="text-muted-foreground text-sm font-medium">
						Inscritos
					</p>
					<p className="text-2xl font-bold">{enrolled}</p>
				</div>
				<div className="bg-card flex min-w-0 flex-col gap-1 rounded-lg border p-4">
					<p className="text-muted-foreground text-sm font-medium">
						Vagas livres
					</p>
					<p className="text-2xl font-bold text-green-600">
						{freeSeats ?? "∞"}
					</p>
				</div>
				<div className="bg-card flex min-w-0 flex-col gap-1 rounded-lg border p-4">
					<p className="text-muted-foreground text-sm font-medium">
						Na fila (aguardando)
					</p>
					<p className="text-2xl font-bold">
						{waitingEntries.length}
					</p>
				</div>
				<div className="bg-card flex min-w-0 flex-col gap-1 rounded-lg border p-4">
					<p className="text-muted-foreground text-sm font-medium">
						Com oferta ativa
					</p>
					<p className="text-2xl font-bold text-amber-600">
						{offeredEntries.length}
					</p>
				</div>
			</div>

			{/* Waitlist Entries */}
			{entries.length === 0 ? (
				<div className="text-muted-foreground py-8 text-center">
					<p className="font-medium">Ninguém na fila de espera</p>
					<p className="text-sm">
						Quando as vagas acabarem, participantes poderão entrar
						na fila.
					</p>
				</div>
			) : (
				<div className="w-full min-w-0">
					{/* Column headers (desktop only) */}
					<div
						className={cn(
							"text-muted-foreground hidden border-b pb-3 text-sm font-medium",
							ROW_GRID,
						)}
					>
						<span>#</span>
						<span>Participante</span>
						<span>Status</span>
						<span>Entrada na fila</span>
						<span className="text-right">Ações</span>
					</div>

					<ul className="w-full divide-y">
						{entries.map((entry, index) => (
							<li
								key={entry.participantId}
								className={cn(
									"hover:bg-muted/50 flex flex-col gap-3 py-4 lg:py-3",
									ROW_GRID,
								)}
							>
								{/* Position (desktop) */}
								<span className="hidden font-medium lg:block">
									{index + 1}
								</span>

								{/* Participant (+ status badge on mobile) */}
								<div className="flex min-w-0 items-start gap-3 lg:items-center">
									{entry.imageUrl ? (
										<img
											src={entry.imageUrl}
											alt=""
											className="h-8 w-8 shrink-0 rounded-full"
										/>
									) : (
										<div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
											<span className="text-sm font-medium">
												{entry.name
													?.charAt(0)
													.toUpperCase()}
											</span>
										</div>
									)}
									<div className="min-w-0 flex-1">
										<p className="truncate font-medium">
											<span className="text-muted-foreground mr-1.5 lg:hidden">
												#{index + 1}
											</span>
											{entry.name}
										</p>
										<p className="text-muted-foreground truncate text-xs">
											{entry.email}
										</p>
										<div className="mt-2 lg:hidden">
											<WaitlistStatusBadge
												status={entry.status}
											/>
										</div>
									</div>
								</div>

								{/* Status (desktop) */}
								<div className="hidden lg:block">
									<WaitlistStatusBadge
										status={entry.status}
									/>
								</div>

								{/* Joined date + offer expiry */}
								<div className="text-muted-foreground text-xs lg:text-sm">
									<span className="lg:hidden">
										Entrada na fila:{" "}
									</span>
									{format(
										entry.joinedAt,
										"dd/MM/yyyy HH:mm",
										{
											locale: ptBR,
										},
									)}
									{entry.status === "offered" &&
										entry.offerExpiresAt && (
											<div className="text-xs text-amber-600">
												Oferta expira:{" "}
												{format(
													entry.offerExpiresAt,
													"dd/MM/yyyy HH:mm",
													{ locale: ptBR },
												)}
											</div>
										)}
								</div>

								{/* Actions */}
								<div className="flex flex-wrap items-center gap-2 lg:justify-end">
									{entry.status === "waiting" &&
										canPromote && (
											<Button
												size="sm"
												variant="default"
												className="max-lg:flex-1"
												onClick={() =>
													promote({
														activityId,
														participantIds: [
															entry.participantId,
														],
													})
												}
												disabled={isPromoting}
											>
												Promover
											</Button>
										)}
									{entry.status === "offered" && (
										<Button
											size="sm"
											variant="outline"
											className="max-lg:flex-1"
											onClick={() =>
												remove({
													activityId,
													participantId:
														entry.participantId,
												})
											}
											disabled={isRemoving}
										>
											Remover oferta
										</Button>
									)}
									{entry.status === "waiting" && (
										<Button
											size="sm"
											variant="destructive"
											className="max-lg:flex-1"
											onClick={() =>
												remove({
													activityId,
													participantId:
														entry.participantId,
												})
											}
											disabled={isRemoving}
										>
											Remover da fila
										</Button>
									)}
								</div>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
