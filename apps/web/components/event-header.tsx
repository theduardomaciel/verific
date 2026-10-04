"use client";

import Link from "next/link";
import { useTransition } from "react";

import { LogOut } from "lucide-react";

import { Header } from "@/components/header/landing-header";
import type { MainNavProps } from "@/components/header/main-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { isAfterEnd } from "@/lib/date";
import { getInitials } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

interface EventHeaderProps {
	eventUrl: string;
	project: {
		id: string;
		name: string;
		url: string;
		endDate: Date | string;
		isArchived: boolean;
		isRegistrationEnabled: boolean;
		logo?: string | null;
		largeLogo?: string | null;
	};
	logo: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
	mobileMenuClassName?: string;
	buttonClassName?: string;
	languageSelectorClassName?: string;
}

function EventUserActions({ eventUrl }: { eventUrl: string }) {
	const session = authClient.useSession();
	const [isPending, startTransition] = useTransition();

	if (!session.data?.user) {
		return (
			<Button asChild size="sm" variant="ghost">
				<Link
					href={`/auth?callbackUrl=${encodeURIComponent(`/${eventUrl}`)}`}
				>
					Entrar
				</Link>
			</Button>
		);
	}

	const user = session.data.user;

	function handleSignOut() {
		startTransition(async () => {
			await authClient.signOut();
			window.location.assign("/");
		});
	}

	return (
		<div className="flex items-center gap-2">
			<Avatar className="h-8 w-8">
				<AvatarImage src={user.image || ""} alt={user.name} />
				<AvatarFallback>{getInitials(user.name)}</AvatarFallback>
			</Avatar>
			<Button
				type="button"
				size="icon"
				variant="ghost"
				onClick={handleSignOut}
				disabled={isPending}
				aria-label="Sair"
			>
				<LogOut className="h-4 w-4" />
			</Button>
		</div>
	);
}

export function EventHeader({
	eventUrl,
	project,
	logo,
	className,
	style,
	mobileMenuClassName,
	buttonClassName,
	languageSelectorClassName,
}: EventHeaderProps) {
	const session = authClient.useSession();
	const userId = session.data?.user.id;
	const enrollment = trpc.checkParticipant.useQuery(
		{ projectUrl: eventUrl },
		{ enabled: Boolean(userId) },
	);
	const isParticipant = enrollment.data === true;
	const registrationOpen =
		project.isRegistrationEnabled &&
		!project.isArchived &&
		!isAfterEnd(new Date(project.endDate));

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
		isParticipant
			? {
					href: "/my",
					label: "Sua Conta",
					className:
						"hover:text-primary-foreground hover:bg-secondary dark:hover:bg-secondary border-secondary font-semibold uppercase border text-primary-foreground text-xs",
					activeClassName: "!text-primary-foreground !bg-secondary",
					mobileClassName:
						"text-primary-foreground uppercase py-3 border border-secondary w-full rounded text-center items-center text-sm bg-secondary",
				}
			: registrationOpen && {
					href: "/subscribe",
					label: "Inscrições",
					className:
						"hover:text-primary-foreground hover:bg-secondary dark:hover:bg-secondary border-secondary font-semibold uppercase border text-primary-foreground text-xs",
					activeClassName: "!text-primary-foreground !bg-secondary",
					mobileClassName:
						"text-primary-foreground uppercase py-3 border border-secondary w-full rounded text-center items-center text-sm bg-secondary",
				},
	].filter(Boolean) as MainNavProps["links"];

	return (
		<Header
			className={className}
			style={{ background: "var(--ev-header-bg)", ...style }}
			mobileMenuClassName={mobileMenuClassName}
			buttonClassName={buttonClassName}
			languageSelectorClassName={languageSelectorClassName}
			links={links}
			prefix={`/${eventUrl}`}
			logo={logo}
			userActions={<EventUserActions eventUrl={eventUrl} />}
		/>
	);
}
