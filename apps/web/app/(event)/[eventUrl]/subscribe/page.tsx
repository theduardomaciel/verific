import Image from "next/image";

// Icons
import { Calendar } from "lucide-react";

// Components
import JoinForm from "@/components/forms/JoinForm";

// api
import { auth } from "@verific/auth";
import { serverClient } from "@/lib/trpc/server";

export default async function EventSubscribePage({
	params,
}: {
	params: Promise<{ eventUrl: string }>;
}) {
	const { eventUrl } = await params;

	const event = await serverClient.getProject({ url: eventUrl });

	const session = await auth();

	return (
		<main className="flex min-h-screen w-full flex-1 flex-col gap-4 text-center">
			<section className="from-primary bg-primary px-landing border-secondary relative w-full border-b-[10px] py-24">
				<div className="container-p z-10 mx-auto flex w-full flex-col items-center gap-8 md:flex-row">
					<div className="z-10 flex flex-1 flex-col items-center justify-center">
						<h1 className="mb-4 text-5xl font-bold text-white">
							Inscreva-se em <br />
							{event.name}
						</h1>
						<div className="mb-4 flex items-center text-lg text-white/90">
							<Calendar className="mr-2 h-4.5 w-4.5" />
							<span className="-mt-0.5 text-base">
								De {event.startDate.toLocaleDateString()} a{" "}
								{event.endDate.toLocaleDateString()}
							</span>
						</div>
					</div>
				</div>

				<Image
					src={event.coverUrl || "/images/hero-bg.png"}
					className="z-0 object-cover"
					alt="Background"
					fill
				/>
			</section>
			<JoinForm user={session?.user || undefined} projectId={event.id} />
		</main>
	);
}
