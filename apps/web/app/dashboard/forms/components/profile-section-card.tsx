"use client";

import { toast } from "sonner";
import { Lock, TriangleAlert, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/react";
import {
	detectProfileDuplicates,
	PROFILE_FIELD_LABELS,
} from "@verific/drizzle/profile";

interface ProfileSectionCardProps {
	projectId: string;
	fields: Array<{ id: string; label: string }>;
}

/**
 * Bloco fixo da seção "Perfil" no builder: sugestão de ativação quando
 * desligado; bloco pré-definido não-removível + aviso de duplicados
 * quando ligado.
 */
export function ProfileSectionCard({ projectId, fields }: ProfileSectionCardProps) {
	const utils = trpc.useUtils();
	const projectQuery = trpc.getProject.useQuery({ id: projectId });
	const updateMutation = trpc.updateProject.useMutation({
		onSuccess: () => {
			utils.getProject.invalidate();
		},
	});

	if (projectQuery.isPending) return null;
	const project = projectQuery.data?.project;
	if (!project) return null;

	async function setProfilesEnabled(enabled: boolean) {
		try {
			await updateMutation.mutateAsync({ id: projectId, profilesEnabled: enabled });
			toast.success(
				enabled ? "Perfis de participantes ativados!" : "Perfis desativados.",
			);
		} catch {
			toast.error("Erro ao atualizar configuração de perfis.");
		}
	}

	if (!project.profilesEnabled) {
		return (
			<Card className="border-dashed">
				<CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
					<div className="flex min-w-0 flex-1 items-start gap-2">
						<UserRound className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
						<div className="min-w-0 flex-1">
							<p className="font-semibold">Ativar perfis de participantes?</p>
							<p className="text-muted-foreground mt-1 text-xs">
								Cada inscrito ganha uma página pública no evento (foto,
								bio, redes e conexões). Ao ativar, uma seção de perfil
								fixa aparece no formulário de inscrição.
							</p>
						</div>
					</div>
					<Button
						size="sm"
						disabled={updateMutation.isPending}
						onClick={() => void setProfilesEnabled(true)}
					>
						Ativar perfis
					</Button>
				</CardContent>
			</Card>
		);
	}

	const duplicates = detectProfileDuplicates(fields);

	return (
		<Card>
			<CardContent className="flex flex-col gap-3 p-4">
				<div className="flex min-w-0 flex-1 items-start gap-2">
					<span
						title="Seção fixa do sistema"
						className="text-muted-foreground mt-0.5 shrink-0 rounded p-1"
					>
						<Lock className="h-5 w-5" />
					</span>
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-center gap-2 font-semibold">
							<span className="truncate">Perfil do participante</span>
							<Badge variant="outline">Fixa</Badge>
							{project.profileFillAtSignup ? (
								<Badge>Na inscrição</Badge>
							) : (
								<Badge variant="secondary">Só no “Editar perfil”</Badge>
							)}
						</div>
						<div className="text-muted-foreground mt-1 text-xs">
							{Object.values(PROFILE_FIELD_LABELS).join(" · ")}
						</div>
					</div>
				</div>
				{duplicates.length > 0 && (
					<div className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs">
						<TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
						<p className="text-muted-foreground">
							Campos que duplicam o perfil:{" "}
							{duplicates
								.map((d) => `“${d.label}” (≈ ${d.profileField})`)
								.join(", ")}
							. Considere removê-los do formulário.
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
