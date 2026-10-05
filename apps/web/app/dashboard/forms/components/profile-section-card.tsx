"use client";

import { toast } from "sonner";
import { TriangleAlert, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/react";
import { detectProfileDuplicates } from "@verific/drizzle/profile";

interface ProfileSectionCardProps {
	projectId: string;
	fields: Array<{ id: string; label: string }>;
	profilesEnabled: boolean;
	profileFillAtSignup: boolean;
	isLoadingProject: boolean;
	/** Versão de rascunho selecionada (p/ inserir a seção de sistema). */
	draftVersionId: string | null;
	isPublished: boolean;
	hasSystemSection: boolean;
}

/**
 * Totem da seção "Perfil" no builder: sugestão de ativação quando
 * desligado; garantia da seção de sistema na versão + aviso de
 * duplicados quando ligado. A seção em si vive ordenável na lista.
 */
export function ProfileSectionCard({
	projectId,
	fields,
	profilesEnabled,
	profileFillAtSignup,
	isLoadingProject,
	draftVersionId,
	isPublished,
	hasSystemSection,
}: ProfileSectionCardProps) {
	const utils = trpc.useUtils();
	const updateMutation = trpc.updateProject.useMutation({
		onSuccess: () => {
			utils.getProject.invalidate();
		},
	});
	const ensureMutation = trpc.ensureProfileSection.useMutation({
		onSuccess: () => {
			utils.getVersion.invalidate();
		},
	});

	// Espaço reservado enquanto os flags carregam (sem pop-in).
	if (isLoadingProject) {
		return <Skeleton className="h-24 w-full" />;
	}

	async function setProfilesEnabled(enabled: boolean) {
		try {
			await updateMutation.mutateAsync({
				id: projectId,
				profilesEnabled: enabled,
			});
			toast.success(
				enabled ? "Perfis de participantes ativados!" : "Perfis desativados.",
			);
		} catch {
			toast.error("Erro ao atualizar configuração de perfis.");
		}
	}

	async function ensureSection() {
		if (!draftVersionId) return;
		try {
			await ensureMutation.mutateAsync({ versionId: draftVersionId });
			toast.success("Seção de perfil adicionada à versão!");
		} catch {
			toast.error("Erro ao adicionar seção de perfil.");
		}
	}

	if (!profilesEnabled) {
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

	if (!hasSystemSection && !isPublished && draftVersionId) {
		return (
			<Card className="border-dashed">
				<CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
					<div className="min-w-0 flex-1">
						<p className="font-semibold">Adicionar seção de perfil?</p>
						<p className="text-muted-foreground mt-1 text-xs">
							Esta versão ainda não tem a seção fixa de perfil
							{profileFillAtSignup
								? " — ela entra primeiro no formulário."
								: " — preencha depois no “Editar perfil”."}
						</p>
					</div>
					<Button
						size="sm"
						disabled={ensureMutation.isPending}
						onClick={() => void ensureSection()}
					>
						Adicionar seção
					</Button>
				</CardContent>
			</Card>
		);
	}

	const duplicates = detectProfileDuplicates(fields);
	if (duplicates.length === 0) return null;

	return (
		<Card>
			<CardContent className="flex items-start gap-2 p-4 text-xs">
				<TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
				<p className="text-muted-foreground">
					Campos que duplicam o perfil:{" "}
					{duplicates
						.map((d) => `“${d.label}” (≈ ${d.profileField})`)
						.join(", ")}
					. Considere removê-los do formulário.
				</p>
			</CardContent>
		</Card>
	);
}
