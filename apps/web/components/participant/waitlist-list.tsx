"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useDashboard } from "@/components/dashboard/dashboard-context";

import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import { WaitlistStatusBadge } from "./waitlist-status-badge";

interface WaitlistListProps {
	activityId: string;
}

export function WaitlistList({ activityId }: WaitlistListProps) {
	const { projectId } = useDashboard();

	const { data, isPending, isError, refetch } =
		trpc.getActivityWaitlist.useQuery(
			{ activityId },
			{
				staleTime: 30 * 1000,
				refetchOnWindowFocus: true,
			},
		);

	const promoteMutation = trpc.promoteFromWaitlist.useMutation({
		onSuccess: () => {
			refetch();
		},
	});

	const removeMutation = trpc.removeFromWaitlist.useMutation({
		onSuccess: () => {
			refetch();
		},
	});

	if (isPending) {
		return (
			<div className="flex w-full flex-col gap-4">
				<div className="bg-muted h-8 w-3/4 animate-pulse rounded" />
				<div className="bg-muted h-8 w-3/4 animate-pulse rounded" />
				<div className="bg-muted h-8 w-3/4 animate-pulse rounded" />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className="text-muted-foreground py-8 text-center">
				Não foi possível carregar a fila de espera.
			</div>
		);
	}

	const { participantsLimit, enrolled, freeSeats, entries } = data;

	const waitingEntries = entries.filter((e) => e.status === "waiting");
	const offeredEntries = entries.filter((e) => e.status === "offered");

	return (
		<div className="flex w-full flex-col gap-4">
			{/* Summary Cards */}
			<div className="flex flex-wrap gap-4">
				<div className="bg-card flex min-w-[150px] flex-1 flex-col gap-1 rounded-lg border p-4">
					<p className="text-muted-foreground text-sm font-medium">
						Limite de vagas
					</p>
					<p className="text-2xl font-bold">
						{participantsLimit ?? "Sem limite"}
					</p>
				</div>
				<div className="bg-card flex min-w-[150px] flex-1 flex-col gap-1 rounded-lg border p-4">
					<p className="text-muted-foreground text-sm font-medium">
						Inscritos
					</p>
					<p className="text-2xl font-bold">{enrolled}</p>
				</div>
				<div className="bg-card flex min-w-[150px] flex-1 flex-col gap-1 rounded-lg border p-4">
					<p className="text-muted-foreground text-sm font-medium">
						Vagas livres
					</p>
					<p className="text-2xl font-bold text-green-600">
						{freeSeats ?? "∞"}
					</p>
				</div>
				<div className="bg-card flex min-w-[150px] flex-1 flex-col gap-1 rounded-lg border p-4">
					<p className="text-muted-foreground text-sm font-medium">
						Na fila (aguardando)
					</p>
					<p className="text-2xl font-bold">
						{waitingEntries.length}
					</p>
				</div>
				<div className="bg-card flex min-w-[150px] flex-1 flex-col gap-1 rounded-lg border p-4">
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
				<div className="h-[400px] w-full overflow-auto">
					<table className="w-full caption-bottom text-sm">
						<thead>
							<tr className="text-muted-foreground border-b text-left">
								<th className="pb-3 font-medium">Posição</th>
								<th className="pb-3 font-medium">
									Participante
								</th>
								<th className="pb-3 font-medium">Status</th>
								<th className="pb-3 font-medium">
									Entrada na fila
								</th>
								<th className="pb-3 font-medium">Ações</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{entries.map((entry, index) => (
								<tr
									key={entry.participantId}
									className="hover:bg-muted/50"
								>
									<td className="py-3 font-medium">
										{index + 1}
									</td>
									<td className="py-3">
										<div className="flex items-center gap-3">
											{entry.imageUrl ? (
												<img
													src={entry.imageUrl}
													alt=""
													className="h-8 w-8 rounded-full"
												/>
											) : (
												<div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
													<span className="text-sm font-medium">
														{entry.name
															?.charAt(0)
															.toUpperCase()}
													</span>
												</div>
											)}
											<div>
												<p className="font-medium">
													{entry.name}
												</p>
												<p className="text-muted-foreground text-xs">
													{entry.email}
												</p>
											</div>
										</div>
									</td>
									<td className="py-3">
										<WaitlistStatusBadge
											status={entry.status}
										/>
									</td>
									<td className="text-muted-foreground py-3">
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
														{
															locale: ptBR,
														},
													)}
												</div>
											)}
									</td>
									<td className="py-3">
										<div className="flex items-center gap-2">
											{entry.status === "waiting" &&
												freeSeats &&
												freeSeats > 0 && (
													<Button
														size="sm"
														variant="default"
														onClick={() =>
															promoteMutation.mutate(
																{
																	activityId,
																	participantIds:
																		[
																			entry.participantId,
																		],
																},
															)
														}
														disabled={
															promoteMutation.isPending
														}
													>
														Promover
													</Button>
												)}
											{entry.status === "offered" && (
												<Button
													size="sm"
													variant="outline"
													onClick={() =>
														removeMutation.mutate({
															activityId,
															participantId:
																entry.participantId,
														})
													}
													disabled={
														removeMutation.isPending
													}
												>
													Remover oferta
												</Button>
											)}
											{entry.status === "waiting" && (
												<Button
													size="sm"
													variant="destructive"
													onClick={() =>
														removeMutation.mutate({
															activityId,
															participantId:
																entry.participantId,
														})
													}
													disabled={
														removeMutation.isPending
													}
												>
													Remover da fila
												</Button>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
