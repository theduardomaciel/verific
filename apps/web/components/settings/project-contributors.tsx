"use client";

import { useState } from "react";

import { toast } from "sonner";

import {
	PROJECT_PERMISSIONS,
	PROJECT_PERMISSION_LABELS,
	PROJECT_ROLE_DEFAULTS,
	PROJECT_ROLE_DESCRIPTIONS,
	PROJECT_ROLE_LABELS,
	projectMemberRoles,
	type ProjectMemberRole,
	type ProjectPermission,
} from "@verific/drizzle/permissions";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { useDashboard } from "@/components/dashboard/dashboard-context";
import { SettingsCard } from "@/components/settings/settings-card";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";

interface Props {
	projectId: string;
	ownerId: string;
}

interface PermissionPickerProps {
	value: ProjectPermission[];
	onChange: (value: ProjectPermission[]) => void;
	disabled?: boolean;
}

function PermissionPicker({
	value,
	onChange,
	disabled,
}: PermissionPickerProps) {
	return (
		<div className="grid gap-2 sm:grid-cols-2">
			{PROJECT_PERMISSIONS.map((permission) => {
				const meta = PROJECT_PERMISSION_LABELS[permission];
				const checked = value.includes(permission);
				return (
					<label
						key={permission}
						htmlFor={permission}
						className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
					>
						<Checkbox
							id={permission}
							checked={checked}
							disabled={disabled}
							onCheckedChange={(next) =>
								onChange(
									next
										? [...value, permission]
										: value.filter((p) => p !== permission),
								)
							}
						/>
						<span className="flex flex-col gap-0.5">
							<span className="text-sm font-medium">
								{meta.label}
							</span>
							<span className="text-muted-foreground text-xs">
								{meta.description}
							</span>
						</span>
					</label>
				);
			})}
		</div>
	);
}

function ContributorRow({
	projectId,
	contributor,
	canManage,
	isSelf,
}: {
	projectId: string;
	contributor: {
		userId: string;
		name: string | null;
		email: string | null;
		role: ProjectMemberRole;
		permissions: ProjectPermission[];
		includeInRanking: boolean;
	};
	canManage: boolean;
	isSelf: boolean;
}) {
	const utils = trpc.useUtils();
	const [role, setRole] = useState<ProjectMemberRole>(contributor.role);
	const [permissions, setPermissions] = useState<ProjectPermission[]>(
		contributor.permissions,
	);
	const [includeInRanking, setIncludeInRanking] = useState(
		contributor.includeInRanking,
	);
	const [editing, setEditing] = useState(false);

	const updateMutation = trpc.updateProjectContributor.useMutation({
		onSuccess: () => {
			void utils.listProjectContributors.invalidate({ projectId });
			setEditing(false);
			toast.success("Permissões atualizadas.");
		},
		onError: (error) => {
			toast.error(error.message || "Não foi possível atualizar.");
		},
	});
	const removeMutation = trpc.removeProjectContributor.useMutation({
		onSuccess: () => {
			void utils.listProjectContributors.invalidate({ projectId });
			toast.success("Membro removido.");
		},
		onError: (error) => {
			toast.error(error.message || "Não foi possível remover.");
		},
	});
	const leaveMutation = trpc.leaveProjectContributor.useMutation({
		onSuccess: () => {
			void utils.listProjectContributors.invalidate({ projectId });
			toast.success("Você saiu do projeto.");
		},
		onError: (error) => {
			toast.error(error.message || "Não foi possível sair.");
		},
	});

	const dirty =
		role !== contributor.role ||
		includeInRanking !== contributor.includeInRanking ||
		permissions.length !== contributor.permissions.length ||
		permissions.some((p) => !contributor.permissions.includes(p));

	function reset() {
		setRole(contributor.role);
		setPermissions(contributor.permissions);
		setIncludeInRanking(contributor.includeInRanking);
		setEditing(false);
	}

	return (
		<li className="flex flex-col gap-4 rounded-md border p-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 flex-col">
					<span className="flex flex-wrap items-center gap-2 text-sm font-medium">
						{contributor.name || "Sem nome"}
						<Badge variant="secondary">
							{PROJECT_ROLE_LABELS[contributor.role]}
						</Badge>
						{contributor.includeInRanking ? (
							<Badge variant="outline">No ranking</Badge>
						) : null}
					</span>
					<span className="text-muted-foreground text-xs">
						{contributor.email}
					</span>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{canManage ? (
						<>
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									setEditing((current) => !current)
								}
							>
								{editing ? "Fechar" : "Editar"}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									removeMutation.mutate({
										projectId,
										userId: contributor.userId,
									})
								}
								disabled={removeMutation.isPending}
							>
								Remover
							</Button>
						</>
					) : isSelf ? (
						<Button
							variant="outline"
							size="sm"
							onClick={() => leaveMutation.mutate({ projectId })}
							disabled={leaveMutation.isPending}
						>
							Sair
						</Button>
					) : null}
				</div>
			</div>

			{editing && canManage ? (
				<div className="flex flex-col gap-4 border-t pt-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex flex-col gap-2">
							<Label>Papel</Label>
							<Select
								value={role}
								onValueChange={(next) => {
									const nextRole = next as ProjectMemberRole;
									setRole(nextRole);
									setPermissions([
										...PROJECT_ROLE_DEFAULTS[nextRole],
									]);
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{projectMemberRoles.map((value) => (
										<SelectItem key={value} value={value}>
											{PROJECT_ROLE_LABELS[value]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-muted-foreground text-xs">
								{PROJECT_ROLE_DESCRIPTIONS[role]}
							</p>
						</div>
						<div className="flex flex-col gap-2">
							<Label>Ranking</Label>
							<label className="flex items-center justify-between gap-4 rounded-md border p-3">
								<span className="text-sm">
									Participar do ranking
									<span className="text-muted-foreground block text-xs">
										Requer inscrição no evento. Ignora a
										exclusão automática de equipe.
									</span>
								</span>
								<Switch
									checked={includeInRanking}
									onCheckedChange={setIncludeInRanking}
								/>
							</label>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label>Permissões</Label>
						<PermissionPicker
							value={permissions}
							onChange={setPermissions}
						/>
					</div>

					<div className="flex flex-wrap gap-2">
						<Button
							size="sm"
							onClick={() =>
								updateMutation.mutate({
									projectId,
									userId: contributor.userId,
									role,
									permissions,
									includeInRanking,
								})
							}
							disabled={!dirty || updateMutation.isPending}
						>
							{updateMutation.isPending
								? "Salvando..."
								: "Salvar alterações"}
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={reset}
							disabled={updateMutation.isPending}
						>
							Cancelar
						</Button>
					</div>
				</div>
			) : null}
		</li>
	);
}

export function ProjectContributors({ projectId, ownerId: _ownerId }: Props) {
	const session = authClient.useSession();
	const { can, isOwner } = useDashboard();
	const canManage = can("team.manage");
	const utils = trpc.useUtils();
	const contributorsQuery = trpc.listProjectContributors.useQuery(
		{ projectId },
		{ staleTime: 2 * 60 * 1000 },
	);

	const [email, setEmail] = useState("");
	const [role, setRole] = useState<ProjectMemberRole>("staff");
	const [permissions, setPermissions] = useState<ProjectPermission[]>([
		...PROJECT_ROLE_DEFAULTS.staff,
	]);
	const [includeInRanking, setIncludeInRanking] = useState(false);

	const addMutation = trpc.addProjectContributor.useMutation({
		onSuccess: () => {
			void utils.listProjectContributors.invalidate({ projectId });
			setEmail("");
			setRole("staff");
			setPermissions([...PROJECT_ROLE_DEFAULTS.staff]);
			setIncludeInRanking(false);
			toast.success("Membro adicionado! Um e-mail foi enviado.");
		},
		onError: (error) => {
			toast.error(error.message || "Não foi possível adicionar.");
		},
	});

	const contributors = contributorsQuery.data?.contributors ?? [];

	return (
		<SettingsCard
			title="Equipe"
			description={
				canManage
					? "Defina quem acessa o painel e o que cada pessoa pode fazer. Monitores operacionais não entram no ranking por padrão."
					: "Somente quem gerencia a equipe pode adicionar ou remover membros."
			}
		>
			<div className="flex flex-col gap-6">
				{canManage ? (
					<div className="flex flex-col gap-4 rounded-md border p-4">
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="flex flex-col gap-2">
								<Label htmlFor="contributor-email">
									E-mail do usuário
								</Label>
								<Input
									id="contributor-email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="usuario@exemplo.com"
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label>Papel</Label>
								<Select
									value={role}
									onValueChange={(next) => {
										const nextRole =
											next as ProjectMemberRole;
										setRole(nextRole);
										setPermissions([
											...PROJECT_ROLE_DEFAULTS[nextRole],
										]);
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{projectMemberRoles.map((value) => (
											<SelectItem
												key={value}
												value={value}
											>
												{PROJECT_ROLE_LABELS[value]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-muted-foreground text-xs">
									{PROJECT_ROLE_DESCRIPTIONS[role]}
								</p>
							</div>
						</div>

						<label className="flex items-center justify-between gap-4 rounded-md border p-3">
							<span className="text-sm">
								Participar do ranking
								<span className="text-muted-foreground block text-xs">
									Permite que este membro concorra ao ranking
									quando também estiver inscrito no evento.
								</span>
							</span>
							<Switch
								checked={includeInRanking}
								onCheckedChange={setIncludeInRanking}
							/>
						</label>

						<div className="flex flex-col gap-2">
							<Label>Permissões</Label>
							<PermissionPicker
								value={permissions}
								onChange={setPermissions}
							/>
						</div>

						<Button
							className="self-start"
							onClick={() =>
								addMutation.mutate({
									projectId,
									email,
									role,
									permissions,
									includeInRanking,
								})
							}
							disabled={addMutation.isPending || !email}
						>
							{addMutation.isPending
								? "Adicionando..."
								: "Adicionar à equipe"}
						</Button>
					</div>
				) : null}

				{contributorsQuery.isPending ? (
					<p className="text-muted-foreground text-sm">
						Carregando equipe...
					</p>
				) : (
					<ul className="flex flex-col gap-2">
						<li className="bg-muted/40 flex items-center justify-between rounded-md border p-3">
							<div className="flex flex-col">
								<span className="text-sm font-medium">
									{isOwner
										? "Você (dono do evento)"
										: "Dono do evento"}
								</span>
								<span className="text-muted-foreground text-xs">
									Todas as permissões, incluindo equipe e
									exclusão.
								</span>
							</div>
							<Badge>Todas</Badge>
						</li>
						{contributors.length === 0 ? (
							<li className="text-muted-foreground py-4 text-sm">
								Nenhum outro membro na equipe.
							</li>
						) : (
							contributors.map((contributor) => (
								<ContributorRow
									key={contributor.userId}
									projectId={projectId}
									contributor={contributor}
									canManage={canManage}
									isSelf={
										contributor.userId ===
										session.data?.user?.id
									}
								/>
							))
						)}
					</ul>
				)}
			</div>
		</SettingsCard>
	);
}
