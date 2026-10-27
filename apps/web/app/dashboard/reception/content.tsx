"use client";

import Link from "next/link";

import { CalendarCheck, Settings, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { BadgeScanner } from "@/components/badge-scanner";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { AddUsersDialog } from "@/components/dialogs/add-users-dialog";

import { trpc } from "@/lib/trpc/react";

function formatDay(day: string): string {
	const date = new Date(`${day}T12:00:00`);
	if (Number.isNaN(date.getTime())) return day;
	return date.toLocaleDateString("pt-BR", {
		weekday: "long",
		day: "2-digit",
		month: "long",
	});
}

export function ReceptionSkeleton() {
	return (
		<div className="container-d py-container-v flex flex-col gap-4">
			<Skeleton className="h-10 w-56" />
			<Skeleton className="h-32 w-full rounded-2xl" />
			<Skeleton className="h-12 w-full rounded-md" />
		</div>
	);
}

export function ReceptionPage() {
	const { projectId } = useDashboard();
	const utils = trpc.useUtils();
	const receptionMutation = trpc.checkInParticipant.useMutation();
	const summary = trpc.getReceptionSummary.useQuery(
		{ projectId },
		// Sem polling: o scanner invalida o resumo a cada check-in. Manter o
		// intervalo só mantinha o Neon acordado com a tela parada.
		{ refetchOnWindowFocus: true },
	);

	async function invalidate() {
		await Promise.all([
			utils.getReceptionSummary.invalidate(),
			utils.getParticipantGamification.invalidate(),
			utils.getEventRanking.invalidate(),
		]);
	}

	if (summary.isPending) {
		return <ReceptionSkeleton />;
	}

	if (summary.isError || !summary.data) {
		return (
			<div className="container-d py-container-v">
				<p className="text-muted-foreground text-sm">
					Não foi possível carregar os dados da recepção.
				</p>
			</div>
		);
	}

	const {
		config,
		day,
		todayCount,
		totalUniqueCount,
		newTodayCount,
		totalParticipants,
		eventDays,
	} = summary.data;
	// "Ainda não credenciados" antes de hoje: total - (únicos já credenciados
	// excluindo os novos de hoje).
	const notYetCheckedIn =
		totalParticipants - (totalUniqueCount - newTodayCount);
	const newTodayPercentage =
		notYetCheckedIn > 0
			? Math.round((newTodayCount / notYetCheckedIn) * 100)
			: 0;

	if (!config.enabled) {
		return (
			<div className="container-d py-container-v flex min-h-[calc(100dvh-var(--dashboard-header-height))] flex-col gap-4">
				<h1 className="text-foreground text-3xl font-bold">Recepção</h1>
				<Card>
					<CardHeader>
						<CardTitle>Gamificação desativada</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col items-start gap-4">
						<p className="text-muted-foreground text-sm">
							Ative a gamificação para registrar check-ins diários
							e pontuar os participantes.
						</p>
						<Button asChild>
							<Link href="/dashboard/settings/gamification">
								<Settings />
								Configurar gamificação
							</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container-d py-container-v flex min-h-[calc(100dvh-var(--dashboard-header-height))] flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-foreground text-3xl font-bold">Recepção</h1>
				<p className="text-muted-foreground text-sm">
					Escaneie o QR do perfil de cada participante. O primeiro
					check-in e o check-in do dia pontuam automaticamente.
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
							<UserPlus className="size-4" />
							Novos hoje
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-1">
						<span className="text-4xl font-bold tabular-nums">
							{newTodayCount}
						</span>
						<span className="text-muted-foreground text-xs">
							{newTodayPercentage}% do total restante
						</span>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
							<CalendarCheck className="size-4" />
							Credenciados hoje
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-1">
						<span className="text-4xl font-bold tabular-nums">
							{todayCount}
						</span>
						<span className="text-muted-foreground text-xs capitalize">
							{formatDay(day)}
						</span>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
							<Users className="size-4" />
							Indivíduos no evento
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-1">
						<span className="text-4xl font-bold tabular-nums">
							{totalUniqueCount}
						</span>
						<span className="text-muted-foreground text-xs">
							{eventDays}{" "}
							{eventDays === 1
								? "dia de evento"
								: "dias de evento"}
						</span>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardContent className="flex flex-col gap-3 pt-6">
					<BadgeScanner
						projectId={projectId}
						mode="reception"
						buttonLabel="Fazer check-in de hoje"
					/>
					<AddUsersDialog
						projectId={projectId}
						alreadyAdded={[]}
						title="Check-in manual"
						description="Selecione os participantes para registrar o check-in de hoje."
						onSubmitSelected={async (participants) => {
							for (const participant of participants) {
								if (!participant.shortId) {
									throw new Error("Participante sem shortId");
								}
								const checked =
									await receptionMutation.mutateAsync({
										projectId,
										code: participant.shortId,
									});
								await invalidate();
								const name =
									checked.name ??
									participant.user?.name ??
									"";
								// eslint-disable-next-line no-console
								if (name) {
									toast.success(
										checked.alreadyCheckedIn
											? `${name} já fez check-in hoje.`
											: `${name} fez check-in.`,
									);
								}
							}
						}}
					>
						<Button variant="outline" className="w-full">
							<UserPlus size={16} className="mr-2" />
							Adicionar por nome
						</Button>
					</AddUsersDialog>
					<p className="text-muted-foreground text-center text-xs">
						O mesmo QR do ingresso/crachá é usado. Repetir o scan no
						mesmo dia não soma pontos de novo.
					</p>
				</CardContent>
			</Card>

			<div className="flex flex-wrap gap-4">
				<Button variant="outline" asChild>
					<Link href="/dashboard/settings/gamification">
						<Settings />
						Configurar pontos e ranking
					</Link>
				</Button>
				<Button variant="outline" asChild>
					<Link href="/dashboard/participants">
						<Users />
						Ver participantes
					</Link>
				</Button>
			</div>
		</div>
	);
}
