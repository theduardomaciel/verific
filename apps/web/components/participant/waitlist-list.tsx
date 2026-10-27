"use client";

import Image from "next/image";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import type { RouterOutput } from "@verific/api";

import { Button } from "@/components/ui/button";

import { WaitlistActionDialog } from "@/components/dialogs/waitlist-action-dialog";

import { cn } from "@/lib/utils";

import { WaitlistStatusBadge } from "./waitlist-status-badge";

type WaitlistData = NonNullable<RouterOutput["getActivityWaitlist"]>;

interface WaitlistListProps {
	activityId: string;
	waitlistData: WaitlistData;
	promote: (args: {
		activityId: string;
		participantIds: string[];
		reason?: string;
		allowOverCapacity?: boolean;
	}) => Promise<void>;
	remove: (args: {
		activityId: string;
		participantId: string;
		reason?: string;
	}) => Promise<void>;
	settle?: (args: { activityId: string }) => Promise<void>;
	isPromoting: boolean;
	isRemoving: boolean;
	isSettling?: boolean;
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
	settle,
	isPromoting,
	isRemoving,
	isSettling,
}: WaitlistListProps) {
	const { participantsLimit, enrolled, freeSeats, overbooked, entries } =
		waitlistData;

	const waitingEntries = entries.filter((e) => e.status === "waiting");
	const offeredEntries = entries.filter((e) => e.status === "offered");

	const canPromote = freeSeats != null && freeSeats > 0;

	const handleSettle = async () => {
		try {
			await settle?.({ activityId });
			toast.success("Fila de espera processada");
		} catch {
			toast.error("Erro ao processar a fila de espera");
		}
	};

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
					{overbooked > 0 ? (
						<p className="text-xs font-medium text-amber-600">
							{overbooked} acima do limite
						</p>
					) : null}
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
										<Image
											src={entry.imageUrl}
											alt=""
											width={32}
											height={32}
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
									{entry.status === "waiting" && (
										<WaitlistActionDialog
											title={
												canPromote
													? "Promover da fila de espera"
													: "Promover sem vaga livre"
											}
											description={
												canPromote ? (
													<>
														Tem certeza que deseja
														promover{" "}
														<strong>
															{entry.name ??
																"Participante"}
														</strong>{" "}
														da fila de espera? A
														vaga será confirmada
														imediatamente e o
														participante será
														notificado por e-mail.
													</>
												) : (
													<>
														A atividade está lotada.
														Promover{" "}
														<strong>
															{entry.name ??
																"Participante"}
														</strong>{" "}
														vai criar uma vaga acima
														do limite (overbooking).
														A organização poderá
														revisar e remover
														depois. A fila de espera
														continua parada até a
														lotação voltar ao
														limite.
													</>
												)
											}
											confirmLabel={
												canPromote
													? "Sim, promover"
													: "Sim, exceder o limite"
											}
											pendingLabel="Promovendo..."
											variant="default"
											successMessage={`${entry.name ?? "Participante"} promovido da fila de espera`}
											errorMessage="Erro ao promover participante"
											onConfirm={async (reason) => {
												await promote({
													activityId,
													participantIds: [
														entry.participantId,
													],
													reason,
													allowOverCapacity:
														!canPromote,
												});
											}}
											isPending={isPromoting}
										>
											<Button
												size="sm"
												variant={
													canPromote
														? "default"
														: "outline"
												}
												className="max-lg:flex-1"
												disabled={isPromoting}
											>
												{canPromote
													? "Promover"
													: "Promover mesmo assim"}
											</Button>
										</WaitlistActionDialog>
									)}
									{entry.status === "offered" && (
										<WaitlistActionDialog
											title="Remover oferta"
											description={
												<>
													Tem certeza que deseja
													remover a oferta de{" "}
													<strong>
														{entry.name ??
															"Participante"}
														?
													</strong>
													A vaga será oferecida para o
													próximo participante na
													fila.
												</>
											}
											confirmLabel="Sim, remover oferta"
											pendingLabel="Removendo..."
											variant="outline"
											successMessage={`Oferta de ${entry.name ?? "Participante"} removida`}
											errorMessage="Erro ao remover oferta"
											onConfirm={async (reason) => {
												await remove({
													activityId,
													participantId:
														entry.participantId,
													reason,
												});
											}}
											isPending={isRemoving}
										>
											<Button
												size="sm"
												variant="outline"
												className="max-lg:flex-1"
												disabled={isRemoving}
											>
												Remover oferta
											</Button>
										</WaitlistActionDialog>
									)}
									{entry.status === "expired" && settle && (
										<Button
											size="sm"
											variant="outline"
											className="max-lg:flex-1"
											disabled={isSettling}
											onClick={() => void handleSettle()}
										>
											{isSettling
												? "Processando..."
												: "Processar fila"}
										</Button>
									)}
									{entry.status === "waiting" && (
										<WaitlistActionDialog
											title="Remover da fila de espera"
											description={
												<>
													Tem certeza que deseja
													remover{" "}
													<strong>
														{entry.name ??
															"Participante"}
													</strong>{" "}
													da fila de espera? Esta ação
													não pode ser desfeita e o
													participante será notificado
													por e-mail.
												</>
											}
											confirmLabel="Sim, remover da fila"
											pendingLabel="Removendo..."
											variant="destructive"
											successMessage={`${entry.name ?? "Participante"} removido da fila de espera`}
											errorMessage="Erro ao remover da fila de espera"
											onConfirm={async (reason) => {
												await remove({
													activityId,
													participantId:
														entry.participantId,
													reason,
												});
											}}
											isPending={isRemoving}
										>
											<Button
												size="sm"
												variant="destructive"
												className="max-lg:flex-1"
												disabled={isRemoving}
											>
												Remover da fila
											</Button>
										</WaitlistActionDialog>
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
