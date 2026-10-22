"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AlertTriangle, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import {
	GAMIFICATION_STICKERS,
	gamificationConfigSchema,
	type GamificationConfig,
	type GamificationPresenceConfig,
	type GamificationRankingConfig,
	type GamificationSessionsConfig,
} from "@verific/drizzle/gamification";

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
import { Switch } from "@/components/ui/switch";

import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

interface GamificationEditorProps {
	projectId: string;
	initial: GamificationConfig;
	eventDays: number;
	profilesEnabled: boolean;
}

function SwitchRow({
	id,
	label,
	description,
	checked,
	onCheckedChange,
	disabled,
}: {
	id: string;
	label: string;
	description?: string;
	checked: boolean;
	onCheckedChange: (value: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<div
			className={cn(
				"flex items-center justify-between gap-4 py-1",
				disabled && "opacity-60",
			)}
		>
			<div className="flex flex-col gap-1">
				<Label htmlFor={id}>{label}</Label>
				{description && (
					<span className="text-muted-foreground text-xs">
						{description}
					</span>
				)}
			</div>
			<Switch
				id={id}
				checked={checked}
				disabled={disabled}
				onCheckedChange={onCheckedChange}
			/>
		</div>
	);
}

function NumberField({
	id,
	label,
	description,
	value,
	onChange,
	min = 0,
	max = 10_000,
	suffix,
	disabled,
}: {
	id: string;
	label: string;
	description?: string;
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	suffix?: string;
	disabled?: boolean;
}) {
	return (
		<div className={cn("flex flex-col gap-1.5", disabled && "opacity-60")}>
			<Label htmlFor={id}>{label}</Label>
			{description && (
				<span className="text-muted-foreground text-xs">
					{description}
				</span>
			)}
			<div className="flex items-center gap-2">
				<Input
					id={id}
					type="number"
					inputMode="numeric"
					min={min}
					max={max}
					value={Number.isFinite(value) ? value : 0}
					disabled={disabled}
					className="w-32"
					onChange={(event) =>
						onChange(Number(event.target.value) || 0)
					}
				/>
				{suffix && (
					<span className="text-muted-foreground text-xs">
						{suffix}
					</span>
				)}
			</div>
		</div>
	);
}

export function GamificationEditor({
	projectId,
	initial,
	eventDays,
	profilesEnabled,
}: GamificationEditorProps) {
	const [draft, setDraft] = useState<GamificationConfig>(initial);
	const [baseline, setBaseline] = useState<GamificationConfig>(initial);
	const utils = trpc.useUtils();
	const saveMutation = trpc.updateGamificationSettings.useMutation();

	const dirty = useMemo(
		() => JSON.stringify(draft) !== JSON.stringify(baseline),
		[draft, baseline],
	);

	useEffect(() => {
		if (!dirty) return;
		function onBeforeUnload(event: BeforeUnloadEvent) {
			event.preventDefault();
		}
		window.addEventListener("beforeunload", onBeforeUnload);
		return () => window.removeEventListener("beforeunload", onBeforeUnload);
	}, [dirty]);

	function patch(patchValue: Partial<GamificationConfig>) {
		setDraft((current) => ({ ...current, ...patchValue }));
	}

	function patchPresence(patchValue: Partial<GamificationPresenceConfig>) {
		setDraft((current) => ({
			...current,
			presence: { ...current.presence, ...patchValue },
		}));
	}

	function patchSessions(patchValue: Partial<GamificationSessionsConfig>) {
		setDraft((current) => ({
			...current,
			sessions: { ...current.sessions, ...patchValue },
		}));
	}

	function patchRanking(patchValue: Partial<GamificationRankingConfig>) {
		setDraft((current) => ({
			...current,
			ranking: { ...current.ranking, ...patchValue },
		}));
	}

	async function onSave() {
		const parsed = gamificationConfigSchema.safeParse(draft);
		if (!parsed.success) {
			toast.error("Revise os valores antes de salvar.");
			return;
		}

		try {
			await saveMutation.mutateAsync({
				projectId,
				config: parsed.data,
			});
			setDraft(parsed.data);
			setBaseline(parsed.data);
			await Promise.all([
				utils.getGamificationSettings.invalidate(),
				utils.getProject.invalidate(),
				utils.getEventRanking.invalidate(),
				utils.getParticipantGamification.invalidate(),
				utils.getMyStanding.invalidate(),
			]);
			toast.success("Gamificação atualizada!");
		} catch {
			toast.error("Erro ao salvar a gamificação.");
		}
	}

	const firstDayPoints =
		draft.presence.firstCheckinPoints +
		(draft.presence.dailyEnabled ? draft.presence.dailyPoints : 0);

	return (
		<div className="mb-6 flex flex-col gap-4">
			<div className="bg-background/90 sticky top-0 z-30 -mx-1 flex flex-wrap items-center justify-between gap-2 px-1 py-2 backdrop-blur">
				<div>
					<h2 className="text-xl font-bold">Gamificação</h2>
					<p className="text-muted-foreground text-sm">
						{dirty
							? "Alterações não salvas."
							: "Pontos, ranking e adesivos do evento."}
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={!dirty || saveMutation.isPending}
						onClick={() => setDraft(baseline)}
					>
						<RotateCcw className="mr-2 h-4 w-4" />
						Descartar
					</Button>
					<Button
						size="sm"
						disabled={!dirty || saveMutation.isPending}
						onClick={() => void onSave()}
					>
						<Save className="mr-2 h-4 w-4" />
						{saveMutation.isPending
							? "Salvando…"
							: "Salvar alterações"}
					</Button>
				</div>
			</div>

			{!profilesEnabled && (
				<div className="flex items-start gap-3 rounded-xl border border-amber-300/70 bg-amber-50/60 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
					<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
					<p>
						Os perfis do evento estão desativados. Ative-os em{" "}
						<Link
							href="/dashboard/settings"
							className="font-semibold underline underline-offset-2"
						>
							Configurações › Geral
						</Link>{" "}
						para que a gamificação apareça no perfil e no ranking.
					</p>
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Ativação</CardTitle>
					<CardDescription>
						Liga ou desliga toda a gamificação do evento. As
						preferências abaixo são preservadas.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<SwitchRow
						id="gamification-enabled"
						label="Ativar gamificação"
						description="Pontos, adesivos e ranking público no evento."
						checked={draft.enabled}
						onCheckedChange={(enabled) => patch({ enabled })}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Presença e check-in</CardTitle>
					<CardDescription>
						Check-ins são registrados na página Recepção, sem
						depender de atividades ou inscrições.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-5">
					<NumberField
						id="first-checkin-points"
						label="Primeiro check-in"
						description="Pontua uma única vez, no primeiro dia em que a pessoa aparece."
						value={draft.presence.firstCheckinPoints}
						onChange={(firstCheckinPoints) =>
							patchPresence({ firstCheckinPoints })
						}
						suffix="pontos"
					/>
					<SwitchRow
						id="daily-enabled"
						label="Pontuar check-in diário"
						description="Soma pontos a cada dia do evento em que a pessoa faz check-in."
						checked={draft.presence.dailyEnabled}
						onCheckedChange={(dailyEnabled) =>
							patchPresence({ dailyEnabled })
						}
					/>
					<NumberField
						id="daily-points"
						label="Check-in do dia"
						description="Somado ao primeiro check-in no dia 1."
						value={draft.presence.dailyPoints}
						onChange={(dailyPoints) =>
							patchPresence({ dailyPoints })
						}
						disabled={!draft.presence.dailyEnabled}
						suffix="pontos por dia"
					/>
					<p className="text-muted-foreground text-xs">
						No primeiro dia, o participante recebe{" "}
						<span className="text-foreground font-semibold">
							{firstDayPoints} pontos
						</span>{" "}
						(primeiro check-in + check-in do dia).
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Atividades</CardTitle>
					<CardDescription>
						Pontos por presença usam a duração programada da sessão,
						não o tempo real escaneado.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-5">
					<NumberField
						id="session-per-hour"
						label="Pontos por hora"
						description="Calculado pela duração agendada da sessão."
						value={draft.sessions.perHour}
						onChange={(perHour) => patchSessions({ perHour })}
						suffix="pontos/hora"
					/>
					<SwitchRow
						id="checkout-enabled"
						label="Habilitar saída (checkout)"
						description="Monitor registra a saída; quem fica até o fim ganha bônus e o adesivo Até o fim."
						checked={draft.sessions.checkoutEnabled}
						onCheckedChange={(checkoutEnabled) =>
							patchSessions({ checkoutEnabled })
						}
					/>
					<NumberField
						id="completion-bonus"
						label="Bônus de conclusão"
						description="Concedido uma vez por sessão concluída."
						value={draft.sessions.completionBonus}
						onChange={(completionBonus) =>
							patchSessions({ completionBonus })
						}
						disabled={!draft.sessions.checkoutEnabled}
						suffix="pontos"
					/>
					<NumberField
						id="completion-grace"
						label="Tolerância de entrada/saída"
						description="Minutos de folga para considerar que a pessoa ficou do início ao fim."
						value={draft.sessions.completionGraceMinutes}
						onChange={(completionGraceMinutes) =>
							patchSessions({ completionGraceMinutes })
						}
						min={0}
						max={120}
						disabled={!draft.sessions.checkoutEnabled}
						suffix="minutos"
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Ranking</CardTitle>
					<CardDescription>
						Ranking público com opt-out. Donos e moderadores ficam
						fora por padrão.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-5">
					<SwitchRow
						id="ranking-enabled"
						label="Exibir ranking público"
						description="Adiciona o link “Ranking” na navegação do evento."
						checked={draft.rankingEnabled}
						onCheckedChange={(rankingEnabled) =>
							patch({ rankingEnabled })
						}
						disabled={!draft.enabled}
					/>
					<NumberField
						id="ranking-top"
						label="Posições exibidas"
						description="A lista mostra até este número de participantes."
						value={draft.ranking.top}
						onChange={(top) =>
							patchRanking({ top: Math.max(3, top) })
						}
						min={3}
						max={100}
						disabled={!draft.enabled || !draft.rankingEnabled}
						suffix="posições"
					/>
					<SwitchRow
						id="ranking-opt-out"
						label="Permitir sair do ranking"
						description="O participante pode ocultar sua posição no perfil, mantendo pontos e adesivos."
						checked={draft.ranking.allowOptOut}
						onCheckedChange={(allowOptOut) =>
							patchRanking({ allowOptOut })
						}
						disabled={!draft.enabled || !draft.rankingEnabled}
					/>
					<SwitchRow
						id="ranking-staff"
						label="Incluir equipe no ranking"
						description="Donos e moderadores também aparecem na classificação pública."
						checked={draft.ranking.includeStaff}
						onCheckedChange={(includeStaff) =>
							patchRanking({ includeStaff })
						}
						disabled={!draft.enabled || !draft.rankingEnabled}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Adesivos</CardTitle>
					<CardDescription>
						Selos SVG gerados pelo app, sem upload. São conquistas
						permanentes assim que atingidas.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-5">
					<SwitchRow
						id="stickers-enabled"
						label="Exibir adesivos"
						description="Mostra a coleção no perfil e desbloqueia selos automáticos."
						checked={draft.stickersEnabled}
						onCheckedChange={(stickersEnabled) =>
							patch({ stickersEnabled })
						}
						disabled={!draft.enabled}
					/>
					<div className="flex flex-wrap gap-2">
						{GAMIFICATION_STICKERS.map((sticker) => (
							<Badge
								key={sticker.key}
								variant="outline"
								className={cn(
									"font-normal",
									!draft.stickersEnabled && "opacity-50",
								)}
								title={sticker.description}
							>
								{sticker.name}
							</Badge>
						))}
					</div>
					<p className="text-muted-foreground text-xs">
						Frequente exige 3 dias e Todo dia exige presença em
						todos os dias; ambos só aparecem em eventos com vários
						dias (este tem {eventDays}). Até o fim exige o checkout
						habilitado.
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Inscrições</CardTitle>
					<CardDescription>
						Pontos ao entrar em uma atividade; cancelar a inscrição
						remove esses pontos e os da presença.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<NumberField
						id="enrollment-points"
						label="Pontos por inscrição"
						value={draft.enrollmentPoints}
						onChange={(enrollmentPoints) =>
							patch({ enrollmentPoints })
						}
						disabled={!draft.enabled}
						suffix="pontos"
					/>
				</CardContent>
			</Card>

			<p className="text-muted-foreground text-xs">
				As alterações valem para as próximas ações. Pontos já
				registrados não são recalculados automaticamente.
			</p>
		</div>
	);
}
