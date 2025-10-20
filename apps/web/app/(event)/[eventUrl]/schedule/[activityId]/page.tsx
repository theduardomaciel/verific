import Link from "next/link";

// Components
import { Button } from "@/components/ui/button";

// API
import { serverClient } from "@/lib/trpc/server";
import { JoinActivityDialog } from "@/components/dialogs/join-activity-dialog";
import { BookLock } from "lucide-react";

export default async function Page({
	params,
}: {
	params: Promise<{ activityId: string; eventUrl: string }>;
}) {
	const { activityId, eventUrl } = await params;

	const { participantId, userId } =
		await serverClient.getParticipantIdByProjectUrl({
			projectUrl: eventUrl,
		});

	const { activity } = await serverClient.getActivity({
		activityId,
	});

	// O conteúdo abaixo é a "visualização de página inteira" do modal
	return (
		<div className="flex min-h-screen items-center justify-center px-4 py-8">
			{!participantId ? (
				<div className="flex flex-col items-center gap-4 text-center">
					<BookLock size={42} className="mb-2" />
					<h1 className="text-2xl font-bold">
						É necessário estar inscrito no evento
					</h1>
					<p className="text-muted-foreground">
						Faça login na plataforma e inscreva-se no evento para
						participar dessa e de outras atividades.
					</p>
					<Button asChild className="w-full">
						<Link href={`/${activity.project.url}/subscribe`}>
							Inscrever-se no evento
						</Link>
					</Button>
					<Button variant="outline" className="w-full" asChild>
						<Link href={`/${activity.project.url}/schedule`}>
							Voltar
						</Link>
					</Button>
				</div>
			) : (
				<JoinActivityDialog
					activity={activity}
					userId={userId}
					participantId={participantId}
				/>
			)}
		</div>
	);
}
