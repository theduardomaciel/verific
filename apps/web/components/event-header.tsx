import { Header } from "@/components/header/landing-header";
import type { MainNavProps } from "@/components/header/main-nav";
import { getEventRegistration } from "@/lib/data";

interface EventHeaderProps {
	eventUrl: string;
	logo: React.ReactNode;
	className?: string;
}

/**
 * Cabeçalho do evento: 100% estático e idêntico para todo visitante.
 * Três itens fixos — "Sobre", "Programação" e o CTA "INSCRIÇÃO"
 * (oculto apenas quando as inscrições estão fechadas ou o evento está
 * arquivado, decidido server-side a partir dos dados do evento).
 * Sem login, avatar, logout ou qualquer conteúdo de sessão.
 */
export async function EventHeader({ eventUrl, logo, className }: EventHeaderProps) {
	const registration = await getEventRegistration(eventUrl);
	const registrationOpen = registration?.isOpen ?? false;

	const links: MainNavProps["links"] = [
		{
			href: "",
			label: "Sobre",
			className:
				"hover:text-primary-foreground/90 text-primary-foreground text-sm hover:bg-transparent",
			activeClassName: "!bg-primary-foreground !text-primary",
			mobileClassName: "text-primary-foreground",
		},
		{
			href: "/schedule",
			label: "Programação",
			className:
				"hover:text-primary-foreground/90 text-primary-foreground text-sm hover:bg-transparent",
			activeClassName: "!bg-primary-foreground !text-primary",
			mobileClassName: "text-primary-foreground",
		},
		...(registrationOpen
			? [
					{
						href: "/subscribe",
						label: "Inscrição",
						className:
							"hover:text-primary-foreground hover:bg-secondary dark:hover:bg-secondary border-secondary font-semibold uppercase border text-primary-foreground text-xs",
						activeClassName: "!text-primary-foreground !bg-secondary",
						mobileClassName:
							"text-primary-foreground uppercase py-3 border border-secondary w-full rounded text-center items-center text-sm bg-secondary",
					} as const,
				]
			: []),
	];

	return (
		<Header
			className={className}
			style={{ background: "var(--ev-header-bg)" }}
			buttonClassName="text-white"
			links={links}
			prefix={`/${eventUrl}`}
			logo={logo}
		/>
	);
}
