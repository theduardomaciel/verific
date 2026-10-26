"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CircleCheckBig } from "lucide-react";

import type { RouterOutput } from "@verific/api";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import JoinForm from "@/components/forms/JoinForm";

import { usePublicSession } from "@/hooks/use-public-session";
import { clearJoinDraft } from "@/lib/forms/join-draft";
import { trpc } from "@/lib/trpc/react";

interface SubscribeGateProps {
	project: {
		id: string;
		url: string;
		name?: string;
		logo?: string;
		colors?: string[];
	};
	/**
	 * Formulário/layout buscados no servidor (`getCachedPublishedForm` +
	 * `getCachedProfileLayout`, ambos com cache por tag): a ilha nasce com
	 * os dados e só espera a sessão — uma query a menos por visitante.
	 */
	formData: RouterOutput["getPublishedForm"];
	profileLayout: RouterOutput["getProfileLayout"] | null;
}

function SubscribeSkeleton() {
	return (
		<div className="flex min-h-[50vh] w-full flex-col gap-6">
			<Skeleton className="h-40 w-full" />
			<Skeleton className="h-64 w-full" />
		</div>
	);
}

/**
 * Ilha de inscrição (cliente) dentro do shell estático: estado neutro com
 * tamanho reservado até a sessão resolver, sem layout shift.
 * - Anônimo ou inscrito em nada: formulário (o login acontece nele).
 * - Já inscrito: aviso com link da conta em vez do formulário.
 */
export function SubscribeGate({
	project,
	formData,
	profileLayout,
}: SubscribeGateProps) {
	const session = usePublicSession();
	const user = session.data?.user;
	const enrollment = trpc.getMyEnrollmentState.useQuery(
		{ projectUrl: project.url, clientSessionId: user?.id },
		{
			enabled: Boolean(user?.id),
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			refetchOnWindowFocus: false,
		},
	);

	// Esqueleto só no primeiro carregamento: revalidações da sessão não
	// trocam o formulário pelo esqueleto (desmontaria o `JoinForm` e
	// apagaria o preenchimento).
	const ready = !session.isPending && (!user || !enrollment.isPending);
	const [gateResolved, setGateResolved] = useState(false);
	// Ajuste durante a renderização (padrão recomendado no lugar de
	// `setState` em efeito): a transição `ready` já re-renderiza.
	if (ready && !gateResolved) {
		setGateResolved(true);
	}

	// Já inscrito: não há mais rascunho a preservar.
	useEffect(() => {
		if (enrollment.data) clearJoinDraft(project.id);
	}, [enrollment.data, project.id]);

	if (!gateResolved || (user && enrollment.isPending && !enrollment.data)) {
		return <SubscribeSkeleton />;
	}

	// Após a primeira resolução o formulário nunca é desmontado por
	// recarregamentos: `enrollment.data` retém o valor anterior durante
	// refetch, e pendente sem dados apenas exibe o formulário.
	if (user && enrollment.data) {
		const { shortId } = enrollment.data;
		return (
			<Card className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 p-8 text-center">
				<CircleCheckBig className="text-secondary h-12 w-12" />
				<h2 className="font-subtitle text-2xl font-bold">
					Você já está inscrito!
				</h2>
				<p className="text-muted-foreground">
					Sua inscrição neste evento já foi confirmada. Acesse seu
					perfil para ver suas atividades e seu QR Code.
				</p>
				<Button className="ev-button font-semibold uppercase" asChild>
					<Link
						href={`/${project.url}/profile/${shortId}?me=1`}
						prefetch={false}
					>
						Acessar meu perfil
					</Link>
				</Button>
			</Card>
		);
	}

	return (
		<JoinForm
			user={user ?? undefined}
			project={project}
			formData={formData}
			profileLayout={profileLayout}
		/>
	);
}
