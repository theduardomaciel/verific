"use client";

import { LogOut, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { LogoutForm } from "@/components/ui/logout-form";
import { Skeleton } from "@/components/ui/skeleton";
import { EditMyAnswersForm } from "@/components/forms/dynamic/EditAnswersForm";
import { ProfileBanner } from "./profile-banner";
import { ProfileOwnerTickets } from "./profile-owner-tickets";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";
import { notFound, useSearchParams } from "next/navigation";

interface ProfileAccountIslandProps {
	eventUrl: string;
	projectId: string;
	shortId: string;
}

/**
 * Modo conta (perfis desativados): shell estático sem nenhum dado pessoal;
 * o conteúdo do dono carrega em ilhas após a sessão resolver. Sem hint não
 * há fetch algum. Não-donos recebem 404.
 */
export function ProfileAccountIsland({
	eventUrl,
	projectId,
	shortId,
}: ProfileAccountIslandProps) {
	const searchParams = useSearchParams();
	const hasHint = searchParams.get("me") !== null;
	const session = authClient.useSession();
	const userId = session.data?.user.id;
	const myProfile = trpc.getMyProfileData.useQuery(
		{ projectUrl: eventUrl },
		{ enabled: hasHint && Boolean(userId) },
	);

	if (!hasHint) {
		return (
			<Card className="w-full p-8 text-center">
				<h1 className="font-heading text-2xl font-bold">
					Perfil indisponível
				</h1>
				<p className="text-muted-foreground mt-2">
					Use o link enviado na confirmação da sua inscrição para acessar
					sua conta.
				</p>
			</Card>
		);
	}

	if (session.isPending || (userId && myProfile.isPending)) {
		return (
			<div className="flex w-full flex-col gap-6">
				<Skeleton className="h-96 w-full rounded-3xl" />
				<Skeleton className="min-h-64 w-full" />
			</div>
		);
	}

	const data = myProfile.data;
	if (!data || data.shortId !== shortId) {
		notFound();
	}

	return (
		<div className="flex w-full flex-col gap-6">
			<ProfileBanner
				name={data.name}
				avatarUrl={data.avatarUrl}
				subtitle={data.accountEmail}
				bio={null}
				socials={[]}
				publicEmail={null}
				showBioAndSocials={false}
				actions={
					<div className="absolute top-8 right-8 z-20 flex gap-2">
						<Dialog>
							<DialogTrigger asChild>
								<Button size="lg" className="ev-button rounded-full">
									<Pencil className="h-4 w-4" />
									Editar inscrição
								</Button>
							</DialogTrigger>
							<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
								<DialogHeader>
									<DialogTitle>Editar inscrição</DialogTitle>
								</DialogHeader>
								<EditMyAnswersForm projectId={projectId} projectUrl={eventUrl} />
							</DialogContent>
						</Dialog>
						<LogoutForm redirectTo={`/${eventUrl}`}>
							<Button
								type="submit"
								variant="outline"
								size="lg"
								className="rounded-full"
							>
								<LogOut className="h-4 w-4" />
								Sair
							</Button>
						</LogoutForm>
					</div>
				}
			/>
			<ProfileOwnerTickets eventUrl={eventUrl} shortId={shortId} />
		</div>
	);
}
