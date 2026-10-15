"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CircleCheckBig } from "lucide-react";

import type { RouterOutput } from "@verific/api";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import JoinForm from "@/components/forms/JoinForm";

import { authClient } from "@/lib/auth-client";
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
 *
 * As queries do formulário (`getPublishedForm` + `getProfileLayout`) vivem
 * aqui — e não dentro do JoinForm — para que o esqueleto cubra o
 * carregamento inteiro: sem elas, o gate resolvia (sessão pronta) e o
 * formulário exibia um segundo estado de "Carregando...".
 */
export function SubscribeGate({ project }: SubscribeGateProps) {
	const session = authClient.useSession();
	const user = session.data?.user;
	const enrollment = trpc.getMyParticipant.useQuery(
		{ projectUrl: project.url },
		{ enabled: Boolean(user?.id) },
	);
	const formQuery = trpc.getPublishedForm.useQuery({
		projectId: project.id,
	});
	const layoutQuery = trpc.getProfileLayout.useQuery({
		projectUrl: project.url,
	});

	// Esqueleto só no carregamento inicial: recarregamentos posteriores
	// (ex.: `useSession` refaz fetch ao trocar de aba, e a query de
	// matrícula habilita após o login) trocariam o formulário pelo
	// esqueleto, desmontando o `JoinForm` e apagando o preenchimento.
	const ready =
		!session.isPending && !formQuery.isPending && !layoutQuery.isPending;
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

	if (!gateResolved) {
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
					<Link href={`/${project.url}/profile/${shortId}?me=1`}>
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
			formData={formQuery.data as RouterOutput["getPublishedForm"]}
			profileLayout={layoutQuery.data ?? null}
		/>
	);
}
