import Image from "next/image";
import { auth } from "@verific/auth";

// Icons
import { Calendar } from "lucide-react";

// Components
import JoinForm from "@/components/forms/JoinForm";

export default async function EventSubscribePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const fetched = await params;
	const id = fetched.id;

	const session = await auth();

	return (
		<main className="flex min-h-screen w-full flex-1 flex-col gap-4 text-center">
			<section className="from-primary bg-primary px-landing border-secondary relative w-full border-b-[10px] py-12">
				<div className="container-p z-10 mx-auto flex w-full flex-col items-center gap-8 md:flex-row">
					<div className="z-10 flex flex-1 flex-col items-center justify-center">
						<h1 className="mb-4 text-5xl font-bold text-white">
							Inscreva-se na <br />
							Secomp 2025
						</h1>
						<div className="mb-4 flex items-center text-lg text-white/90">
							<Calendar className="mr-2 h-4.5 w-4.5" />
							<span className="-mt-0.5 text-base">
								De 18/01/2024 a 27/01/2024
							</span>
						</div>
					</div>
				</div>

				<Image
					src={"/images/hero-bg.png"}
					className="z-0 object-cover"
					alt="Background"
					fill
				/>
			</section>
			<JoinForm user={session?.user || undefined} projectId={id} />
		</main>
	);
}
