"use client";

import { useState } from "react";

import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutput } from "@verific/api";
import { NOTIFICATION_TYPE_LABELS } from "@verific/api/schemas";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	ConfirmDialog,
	useConfirmDialog,
} from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

import { useDashboard } from "@/components/dashboard/dashboard-context";
import { SettingsCard } from "@/components/settings/settings-card";

import { trpc } from "@/lib/trpc/react";

type SettingItem = RouterOutput["getNotificationSettings"]["settings"][number];

const AUDIENCE_SECTIONS = [
	{
		audience: "participant",
		title: "Participantes",
		description:
			"E-mails enviados para quem se inscreveu no evento ou nas atividades.",
	},
	{
		audience: "organizer",
		title: "Organização",
		description: "E-mails enviados para a organização do evento.",
	},
] as const;

const SCOPE_TITLES = {
	event: "Evento",
	activity: "Atividades",
} as const;

function groupSettings(settings: SettingItem[]) {
	return AUDIENCE_SECTIONS.map((section) => ({
		...section,
		scopes: (["event", "activity"] as const)
			.map((scope) => ({
				scope,
				title: SCOPE_TITLES[scope],
				items: settings.filter(
					(setting) =>
						setting.audience === section.audience &&
						setting.scope === scope,
				),
			}))
			.filter((group) => group.items.length > 0),
	})).filter((section) => section.scopes.length > 0);
}

function SettingToggle({
	item,
	enabled,
	onChange,
	disabled,
}: {
	item: SettingItem;
	enabled: boolean;
	onChange: (enabled: boolean) => void;
	disabled: boolean;
}) {
	const id = `notification-${item.type}`;
	const label = NOTIFICATION_TYPE_LABELS[item.type];
	return (
		<div className="flex items-start justify-between gap-4 rounded-lg border p-4">
			<div className="flex min-w-0 flex-col gap-1">
				<Label htmlFor={id} className="text-sm font-medium">
					{label}
				</Label>
				<p className="text-muted-foreground text-sm">
					{item.description}
				</p>
			</div>
			<Switch
				id={id}
				checked={enabled}
				onCheckedChange={onChange}
				disabled={disabled}
				aria-label={label}
			/>
		</div>
	);
}

export default function NotificationSettingsPage() {
	const { projectId } = useDashboard();
	const utils = trpc.useUtils();
	const settingsQuery = trpc.getNotificationSettings.useQuery(
		{ projectId },
		{ staleTime: 2 * 60 * 1000, refetchOnWindowFocus: false },
	);
	const updateMutation = trpc.updateNotificationSettings.useMutation();

	/** Local edits; `null` means "mirror the server values". */
	const [draft, setDraft] = useState<Record<string, boolean> | null>(null);
	const { confirm, dialogProps } = useConfirmDialog();

	const settings = settingsQuery.data?.settings;

	if (settingsQuery.isPending) {
		return (
			<div className="flex flex-col gap-6">
				<Skeleton className="h-52 w-full" />
				<Skeleton className="h-52 w-full" />
			</div>
		);
	}

	if (settingsQuery.isError || !settings) {
		return (
			<Alert variant="destructive">
				<TriangleAlert />
				<AlertTitle>Erro ao carregar</AlertTitle>
				<AlertDescription>
					Não foi possível carregar as configurações de notificação.
					<Button
						variant="outline"
						size="sm"
						className="mt-2"
						onClick={() => {
							void settingsQuery.refetch();
						}}
					>
						Tentar novamente
					</Button>
				</AlertDescription>
			</Alert>
		);
	}

	const values =
		draft ??
		Object.fromEntries(settings.map((item) => [item.type, item.enabled]));
	const groups = groupSettings(settings);
	const changes = settings
		.filter((item) => values[item.type] !== item.enabled)
		.map((item) => ({
			type: item.type,
			enabled: values[item.type] ?? false,
		}));
	const isDirty = changes.length > 0;
	const isSaving = updateMutation.isPending;
	const confirmationDisabled =
		values["event_registration_confirmation"] === false;

	async function handleSave() {
		if (!isDirty || isSaving) return;
		const disablingConfirmation = changes.some(
			(change) =>
				change.type === "event_registration_confirmation" &&
				!change.enabled,
		);
		if (disablingConfirmation) {
			const ok = await confirm({
				title: "Desativar confirmação de inscrição?",
				description:
					"Novos inscritos deixarão de receber o e-mail de confirmação da inscrição. Eles ainda poderão consultar os dados na página do evento.",
				confirmLabel: "Desativar",
				confirmVariant: "destructive",
			});
			if (!ok) return;
		}
		try {
			await updateMutation.mutateAsync({ projectId, settings: changes });
			await utils.getNotificationSettings.invalidate();
			setDraft(null);
			toast.success("Configurações de notificação atualizadas!");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Erro ao atualizar configurações de notificação.",
			);
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h2 className="text-foreground text-xl font-semibold">
					Notificações
				</h2>
				<p className="text-muted-foreground text-sm">
					Escolha quais e-mails este evento pode enviar. E-mails
					desativados são registrados como ignorados no painel de
					e-mails e não consomem a cota diária.
				</p>
			</div>

			{confirmationDisabled ? (
				<Alert className="border-warning/30 bg-warning/5 [&>svg]:text-warning">
					<TriangleAlert />
					<AlertTitle>Confirmação de inscrição desativada</AlertTitle>
					<AlertDescription>
						Novos inscritos não vão receber nenhum e-mail de
						confirmação. Lembre-se de salvar para aplicar.
					</AlertDescription>
				</Alert>
			) : null}

			{groups.map((section) => (
				<SettingsCard
					key={section.audience}
					title={section.title}
					description={section.description}
				>
					<div className="flex flex-col gap-6">
						{section.scopes.map((group) => (
							<div
								key={group.scope}
								className="flex flex-col gap-3"
							>
								<h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
									{group.title}
								</h3>
								<div className="flex flex-col gap-3">
									{group.items.map((item) => (
										<SettingToggle
											key={item.type}
											item={item}
											enabled={
												values[item.type] ??
												item.defaultEnabled
											}
											onChange={(enabled) =>
												setDraft((current) => ({
													...(current ??
														Object.fromEntries(
															settings.map(
																(setting) => [
																	setting.type,
																	setting.enabled,
																],
															),
														)),
													[item.type]: enabled,
												}))
											}
											disabled={isSaving}
										/>
									))}
								</div>
							</div>
						))}
					</div>
				</SettingsCard>
			))}

			<div className="flex items-center justify-end gap-2">
				<Button
					variant="outline"
					onClick={() => setDraft(null)}
					disabled={!isDirty || isSaving}
				>
					Descartar
				</Button>
				<Button
					onClick={() => void handleSave()}
					disabled={!isDirty || isSaving}
				>
					{isSaving ? <Loader2 className="animate-spin" /> : null}
					Salvar alterações
				</Button>
			</div>

			<ConfirmDialog {...dialogProps} />
		</div>
	);
}
