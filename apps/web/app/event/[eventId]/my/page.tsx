import { ActivityTicket } from "@/components/event/activity-ticket";
import Image from "next/image";

export default function EventAccountPage() {
	const workshopData = {
		title: "Workshop de Arduino",
		startTime: "9:10 AM",
		endTime: "11:50 AM",
		maxParticipants: 300,
		currentParticipants: 235,
		tolerance: "15m",
		speakerName: "Ranilson Oscar Araujo Paiva",
		speakerRole:
			"Docente no Instituto de Matemática e especialista em validação ético jurídica de modelos de inteligência artificial",
		speakerImage: "/placeholder.svg?height=48&width=48",
		description:
			"Descubra novas abordagens para a Matemática Inclusiva. Junte-se a nós para uma discussão enriquecedora sobre práticas...",
		attendanceTime: "9h15",
	};

	return (
		<main className="bg-background min-h-screen">
			{/* Hero Section */}
			<section className="from-primary bg-primary px-landing border-secondary relative w-full border-b-[10px] py-12">
				<div className="container-p z-10 mx-auto flex w-full flex-col gap-8 md:flex-row">
					<div className="z-10 flex flex-1 flex-col items-start justify-center">
						<h1 className="mb-4 text-5xl font-bold text-white">
							Sua Conta
						</h1>
						<p className="text-primary-foreground/90 text-base font-semibold md:max-w-md">
							Gerencie seus dados, eventos inscritos e
							preferências com facilidade.
						</p>
					</div>
				</div>

				<Image
					src={"/images/hero-bg.png"}
					className="z-0 object-cover"
					alt="Background"
					fill
				/>
			</section>
			<div className="container-p mx-auto flex w-full flex-col items-center justify-center pt-16">
				<div className="mb-8 flex grid-cols-2 flex-col justify-between gap-4 md:gap-12">
					<ActivityTicket {...workshopData} role="user" />
					<ActivityTicket {...workshopData} role="moderator" />
				</div>
			</div>
		</main>
	);
}
