"use client";

import { useState } from "react";

import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { GAMIFICATION_STICKERS } from "@verific/drizzle/gamification";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import { trpc } from "@/lib/trpc/react";

const SOURCE_LABELS: Record<string, string> = {
	checkin: "Primeiro check-in",
	daily: "Check-in do dia",
	session: "Presença em sessão",
	completion: "Conclusão de sessão",
	enrollment: "Inscrição",
	manual: "Ajuste manual",
};

function formatSigned(value: number): string {
	return value > 0 ? `+${value}` : String(value);
}

export function ManualPointsCard({
	projectId,
	participantId,
	participantName,
}: {
	projectId: string;
	participantId: string;
	participantName: string;
}) {
	const utils = trpc.useUtils();
	const query = trpc.getParticipantPoints.useQuery(
		{ projectId, participantId },
		{ staleTime: 15_000 },
	);
	const awardMutation = trpc.awardManualPoints.useMutation();
	const stickerMutation = trpc.grantParticipantSticker.useMutation();

	const [points, setPoints] = useState("10");
	const [note, setNote] = useState("");
	const [stickerKey, setStickerKey] = useState("");

	if (query.isPending || !query.data?.enabled) return null;

	const data = query.data;

	async function invalidate() {
		await Promise.all([
			utils.getParticipantPoints.invalidate(),
			utils.getParticipantGamification.invalidate(),
			utils.getEventRanking.invalidate(),
		]);
	}

	async function handleAward() {
		const parsed = Number(points);
		if (!Number.isInteger(parsed) || parsed === 0) {
			toast.error("Informe um número inteiro diferente de zero.");
			return;
		}
		try {
			await awardMutation.mutateAsync({
				projectId,
				participantId,
				points: parsed,
				note: note.trim() || undefined,
			});
			setNote("");
			await invalidate();
			toast.success(
				`${parsed > 0 ? "Pontos adicionados" : "Pontos removidos"} de ${participantName}.`,
			);
		} catch {
			toast.error("Não foi possível lançar os pontos.");
		}
	}

	async function handleGrantSticker() {
		if (!stickerKey) return;
		try {
			const result = await stickerMutation.mutateAsync({
				projectId,
				participantId,
				stickerKey,
			});
			setStickerKey("");
			await invalidate();
			toast.success(
				result.granted
					? "Adesivo concedido!"
					: "Este participante já tem esse adesivo.",
			);
		} catch {
			toast.error("Não foi possível conceder o adesivo.");
		}
	}

	return (
		<Card className="w-full text-left">
			<CardHeader>
				<div className="flex items-center justify-between gap-3">
					<CardTitle>Gamificação</CardTitle>
					<Badge
						variant="secondary"
						className="text-base tabular-nums"
					>
						{data.total} pts
					</Badge>
				</div>
				<CardDescription>
					Lançamentos manuais ficam auditados no extrato.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-5">
				<div className="flex flex-col gap-3">
					<div className="grid gap-3 sm:grid-cols-[8rem_1fr_auto]">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="manual-points">Pontos</Label>
							<Input
								id="manual-points"
								type="number"
								inputMode="numeric"
								value={points}
								onChange={(event) =>
									setPoints(event.target.value)
								}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="manual-note">Motivo</Label>
							<Input
								id="manual-note"
								value={note}
								placeholder="Ex.: ajudou na organização"
								maxLength={500}
								onChange={(event) =>
									setNote(event.target.value)
								}
							/>
						</div>
						<Button
							className="self-end"
							disabled={awardMutation.isPending}
							onClick={() => void handleAward()}
						>
							<Plus />
							Lançar
						</Button>
					</div>
					<p className="text-muted-foreground text-xs">
						Use valores negativos para remover pontos. Máximo de
						10.000 por lançamento.
					</p>
				</div>

				<div className="flex flex-col gap-2 border-t pt-4">
					<Label>Conceder adesivo</Label>
					<div className="flex flex-col gap-2 sm:flex-row">
						<Select
							value={stickerKey}
							onValueChange={setStickerKey}
						>
							<SelectTrigger className="w-full sm:flex-1">
								<SelectValue placeholder="Escolha um adesivo" />
							</SelectTrigger>
							<SelectContent>
								{GAMIFICATION_STICKERS.map((sticker) => (
									<SelectItem
										key={sticker.key}
										value={sticker.key}
									>
										{sticker.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							variant="outline"
							disabled={!stickerKey || stickerMutation.isPending}
							onClick={() => void handleGrantSticker()}
						>
							<Sparkles />
							Conceder
						</Button>
					</div>
				</div>

				<div className="flex flex-col gap-2 border-t pt-4">
					<h4 className="text-sm font-semibold">Extrato recente</h4>
					{data.events.length === 0 ? (
						<p className="text-muted-foreground text-xs">
							Nenhum ponto lançado ainda.
						</p>
					) : (
						<ul className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
							{data.events.map((event) => (
								<li
									key={event.id}
									className="flex items-start justify-between gap-3 text-sm"
								>
									<div className="flex min-w-0 flex-col">
										<span className="font-medium">
											{SOURCE_LABELS[event.source] ??
												event.source}
										</span>
										<span className="text-muted-foreground text-xs">
											{new Date(
												event.createdAt,
											).toLocaleString("pt-BR", {
												day: "2-digit",
												month: "2-digit",
												hour: "2-digit",
												minute: "2-digit",
											})}
											{event.note
												? ` · ${event.note}`
												: ""}
										</span>
									</div>
									<span
										className={
											event.points >= 0
												? "text-foreground font-semibold tabular-nums"
												: "text-destructive font-semibold tabular-nums"
										}
									>
										{formatSigned(event.points)}
									</span>
								</li>
							))}
						</ul>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
