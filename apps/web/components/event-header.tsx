import { Header } from "@/components/header/landing-header";
import type { MainNavProps } from "@/components/header/main-nav";
import { getEventRegistration, getProject } from "@/lib/data";
import { resolveEventTheme } from "@/lib/theme/resolve";

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

	// `getProject` tem cache (`"use cache"`), então esta segunda leitura é
	// barata: serve só para derivar as classes do cabeçalho a partir do tema.
	const result = await getProject(eventUrl);
	const { theme } = resolveEventTheme({
		theme: (result?.project as { theme?: unknown } | undefined)?.theme,
		primaryColor: result?.project?.primaryColor,
		secondaryColor: result?.project?.secondaryColor,
	});

	// Realce na cor oposta à do cabeçalho sólido (primário → secundário e
	// vice-versa). Gradiente/transparente mantêm o padrão (secundário).
	// O hover vai em `buttonClassName` (no `Button`, não no `Link`): o
	// variant `ghost` traz `dark:hover:bg-accent/50`, que vence por
	// especificidade no modo escuro quando ambos coexistem. Mesclado via
	// `cn` no `Button`, o `tailwind-merge` remove as regras do variant —
	// incluindo as empilhadas `dark:hover:`, daí as duplicatas abaixo.
	// Classes literais — sem interpolação — para o Tailwind gerá-las.
	// Isso também aposenta o `hover:text-primary-foreground/90` quebrado
	// (mistura via `color-mix` sem suporte garantido).
	const solidSecondary =
		theme.header.style === "solid" && theme.header.bg === "secondary";
	const navClass = solidSecondary
		? "text-secondary-foreground text-sm"
		: "text-primary-foreground text-sm";
	const navButtonClass = solidSecondary
		? "hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground"
		: "hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary dark:hover:text-secondary-foreground";
	const navActiveClass = solidSecondary
		? "!bg-secondary-foreground !text-secondary"
		: "!bg-primary-foreground !text-primary";
	const navMobileClass = solidSecondary
		? "text-secondary-foreground"
		: "text-primary-foreground";
	const ctaClass = solidSecondary
		? "border-primary font-semibold uppercase border text-secondary-foreground text-xs"
		: "border-secondary font-semibold uppercase border text-primary-foreground text-xs";
	const ctaButtonClass = solidSecondary
		? "hover:text-primary-foreground hover:bg-primary dark:hover:text-primary-foreground dark:hover:bg-primary"
		: "hover:text-secondary-foreground hover:bg-secondary dark:hover:text-secondary-foreground dark:hover:bg-secondary";
	const ctaActiveClass = solidSecondary
		? "!text-primary-foreground !bg-primary"
		: "!text-secondary-foreground !bg-secondary";
	const ctaMobileClass = solidSecondary
		? "text-primary-foreground uppercase py-3 border border-primary w-full rounded text-center items-center text-sm bg-primary"
		: "text-secondary-foreground uppercase py-3 border border-secondary w-full rounded text-center items-center text-sm bg-secondary";

	const links: MainNavProps["links"] = [
		{
			href: "",
			label: "Sobre",
			className: navClass,
			buttonClassName: navButtonClass,
			activeClassName: navActiveClass,
			mobileClassName: navMobileClass,
		},
		{
			href: "/schedule",
			label: "Programação",
			className: navClass,
			buttonClassName: navButtonClass,
			activeClassName: navActiveClass,
			mobileClassName: navMobileClass,
		},
		...(registrationOpen
			? [
					{
						href: "/subscribe",
						label: "Inscrição",
						className: ctaClass,
						buttonClassName: ctaButtonClass,
						activeClassName: ctaActiveClass,
						mobileClassName: ctaMobileClass,
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
