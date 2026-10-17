"use client";

import { useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { SettingsCard } from "@/components/settings/settings-card";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";

interface Props {
	projectId: string;
	ownerId: string;
}

export function ProjectContributors({ projectId, ownerId }: Props) {
	const session = authClient.useSession();
	const isOwner = session.data?.user?.id === ownerId;
	const utils = trpc.useUtils();
	const contributorsQuery = trpc.listProjectContributors.useQuery(
		{ projectId },
		{ staleTime: 30 * 1000 },
	);
	const addMutation = trpc.addProjectContributor.useMutation({
		onSuccess: () => {
			void utils.listProjectContributors.invalidate({ projectId });
			setEmail("");
			toast.success("Contribuidor adicionado! Um e-mail foi enviado.");
		},
		onError: (error) => {
			toast.error(error.message || "Não foi possível adicionar.");
		},
	});
	const removeMutation = trpc.removeProjectContributor.useMutation({
		onSuccess: () => {
			void utils.listProjectContributors.invalidate({ projectId });
			toast.success("Contribuidor removido.");
		},
		onError: (error) => {
			toast.error(error.message || "Não foi possível remover.");
		},
	});

	const [email, setEmail] = useState("");

	const contributors = contributorsQuery.data ?? [];

	return (
		<SettingsCard
			title="Contribuidores"
			description="Compartilhe o projeto com outros usuários. Eles terão acesso ao painel e poderão colaborar."
		>
			<div className="flex flex-col gap-4">
				{isOwner ? (
					<div className="flex flex-col gap-2 sm:flex-row sm:items-end">
						<div className="flex flex-col gap-3 sm:flex-1">
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
						<Button
							onClick={() =>
								addMutation.mutate({ projectId, email })
							}
							disabled={addMutation.isPending || !email}
						>
							{addMutation.isPending
								? "Adicionando..."
								: "Adicionar"}
						</Button>
					</div>
				) : null}

				{contributorsQuery.isPending ? (
					<p className="text-muted-foreground text-sm">
						Carregando contribuidores...
					</p>
				) : contributors.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nenhum contribuidor adicionado ainda.
					</p>
				) : (
					<ul className="flex flex-col gap-2">
						{contributors.map((contributor) => (
							<li
								key={contributor.userId}
								className="flex items-center justify-between rounded-md border p-3"
							>
								<div className="flex flex-col">
									<span className="text-sm font-medium">
										{contributor.name || "Sem nome"}
									</span>
									<span className="text-muted-foreground text-xs">
										{contributor.email}
									</span>
								</div>
								{isOwner ? (
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
								) : null}
							</li>
						))}
					</ul>
				)}
			</div>
		</SettingsCard>
	);
}
