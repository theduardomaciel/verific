"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/react";

interface ProfileSectionCardProps {
	projectId: string;
	profilesEnabled: boolean;
	isLoadingProject: boolean;
}

/**
 * Totem de perfis no builder: sugere ativar e aponta p/ o editor de
 * layout (Configurações → Perfil), onde campos viram blocos do perfil.
 */
export function ProfileSectionCard({
	projectId,
	profilesEnabled,
	isLoadingProject,
}: ProfileSectionCardProps) {
	const utils = trpc.useUtils();
	const updateMutation = trpc.updateProject.useMutation({
		onSuccess: () => {
			utils.getProject.invalidate();
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

	if (!profilesEnabled) {
		return (
			<Card className="border-dashed">
				<CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
					<div className="flex min-w-0 flex-1 items-start gap-2">
						<UserRound className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
						<div className="min-w-0 flex-1">
							<p className="font-semibold">Ativar perfis de participantes?</p>
							<p className="text-muted-foreground mt-1 text-xs">
								Cada inscrito ganha uma página pública no evento. Ao
								ativar, configure o layout em Configurações → Perfil.
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

	return (
		<Card className="border-dashed">
			<CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
				<div className="min-w-0 flex-1">
					<p className="font-semibold">Layout do perfil</p>
					<p className="text-muted-foreground mt-1 text-xs">
						Ligue campos deste formulário aos blocos fixos do perfil
						(subtítulo, bio, stats, redes, e-mail).
					</p>
				</div>
				<Button size="sm" variant="outline" asChild>
					<Link href="/dashboard/settings/profile-layout">
						Configurar layout
						<ArrowRight className="ml-2 h-4 w-4" />
					</Link>
				</Button>
			</CardContent>
		</Card>
	);
}
