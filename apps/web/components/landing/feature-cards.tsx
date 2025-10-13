import type React from "react";
import { Settings, Users, Ticket, FileCheck } from "lucide-react";

export function FeatureCards() {
	return (
		<section className="px-landing container-p py-8 md:py-12 lg:py-16">
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				<FeatureCard
					icon={<Settings className="h-8 w-8" />}
					title="Gerenciamento descomplicado"
					description="Centralize todas as etapas do evento em um só lugar: agenda, palestras, inscrições e relatórios — tudo intuitivo e fácil de usar."
				/>
				<FeatureCard
					icon={<Users className="h-8 w-8" />}
					title="Inscrições automatizadas"
					description="Simplifique o cadastro de participantes com formulários dinâmicos e acompanhamento em tempo real das inscrições."
				/>
				<FeatureCard
					icon={<Ticket className="h-8 w-8" />}
					title="Credenciamento eficiente"
					description="Otimize o check-in com QR Code e integração instantânea, garantindo agilidade e uma ótima primeira impressão para o público."
				/>
				<FeatureCard
					icon={<FileCheck className="h-8 w-8" />}
					title="Certificação com um clique"
					description="Emita certificados personalizados de forma automática e segura, reduzindo tempo e eliminando erros manuais."
				/>
			</div>
		</section>
	);
}

interface FeatureCardProps {
	icon: React.ReactNode;
	title: string;
	description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
	return (
		<div className="bg-muted rounded-lg p-6">
			<div className="text-primary mb-4">{icon}</div>
			<h3 className="mb-2 text-lg font-medium">{title}</h3>
			<p className="text-muted-foreground text-sm">{description}</p>
		</div>
	);
}
