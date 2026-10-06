import { Header } from "@/components/header/landing-header";
import type { MainNavProps } from "@/components/header/main-nav";
import {
	EVENT_CTA_CLASS,
	EVENT_MENU_BUTTON_CLASS,
	MOBILE_CTA_CLASS,
	MOBILE_NAV_CLASS,
} from "@/components/landing/event-nav";
import { getEventRegistration } from "@/lib/data";

interface EventHeaderProps {
	eventUrl: string;
	logo: React.ReactNode;
	className?: string;
}

/**
 * Links do cabeçalho do evento: dados estáticos de módulo, sem lógica de
 * tema. As cores vêm todas dos tokens `--ev-nav-*`/`--ev-cta-*` derivados
 * server-side, então o mesmo conjunto funciona em qualquer estilo/cor de
 * cabeçalho e nos dois modos de cor.
 */
const NAV_LINKS: MainNavProps["links"] = [
	{
		href: "",
		label: "Sobre",
		variant: "event-nav",
		mobileClassName: MOBILE_NAV_CLASS,
	},
	{
		href: "/schedule",
		label: "Programação",
		variant: "event-nav",
		mobileClassName: MOBILE_NAV_CLASS,
	},
];

/**
 * Cabeçalho do evento: 100% estático e idêntico para todo visitante.
 * Dois links fixos — "Sobre" e "Programação" — e o CTA "Inscrição" (apenas
 * quando as inscrições estão abertas, decidido server-side a partir dos
 * dados do evento). Sem login, avatar, logout ou qualquer conteúdo de
 * sessão.
 */
export async function EventHeader({
	eventUrl,
	logo,
	className,
}: EventHeaderProps) {
	const registration = await getEventRegistration(eventUrl);

	// `isOpen` é o campo derivado que já considera o toggle, o arquivamento
	// e o fim do evento — o mesmo que `EventAction` usa para habilitar o CTA.
	// (a página de inscrição redireciona com `isRegistrationEnabled`, que é
	// só o switch do organizador: divergir dos dois deixaria um CTA
	// apontando para um redirect.)
	const links = registration?.isOpen
		? [
				...NAV_LINKS,
				{
					href: "/subscribe",
					label: "Inscrição",
					variant: "event-cta" as const,
					className: EVENT_CTA_CLASS,
					mobileClassName: MOBILE_CTA_CLASS,
				},
			]
		: NAV_LINKS;

	return (
		<Header
			className={className}
			style={{ background: "var(--ev-header-bg)" }}
			buttonClassName={EVENT_MENU_BUTTON_CLASS}
			eventMenu
			links={links}
			prefix={`/${eventUrl}`}
			logo={logo}
		/>
	);
}
