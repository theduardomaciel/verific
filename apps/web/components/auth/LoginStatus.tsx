import type { ReactNode } from "react";
import { useTransition } from "react";

import { cn } from "@/lib/utils";

// Components
import { Panel } from "@/components/forms";
import GoogleButton, { ContinueRegistrationButton } from "./GoogleButton";

// Icons
import { LoaderCircle, LogOut } from "lucide-react";
import { Button } from "../ui/button";

// Actions
import { signOutAction } from "@/app/actions";

interface NotLoggedProps {
	className?: string;
	href: string;
	isAuthenticated?: boolean;
	children: ReactNode;
}

export function NotLogged({
	className,
	href,
	isAuthenticated,
	children,
}: NotLoggedProps) {
	return (
		<div
			className={cn(
				"border-primary-200/50 flex w-full flex-col flex-wrap items-start justify-center gap-4 rounded-md border-2 border-dashed px-8 py-8 text-base font-medium md:flex-row md:items-center md:gap-9 md:py-4",
				className,
			)}
		>
			<span className="font-title font-bold">Eita!</span>
			<span className="flex-1 text-left">
				{children ||
					"Você precisa estar logado para ver os eventos internos."}
			</span>
			{isAuthenticated ? (
				<ContinueRegistrationButton
					callbackUrl={href}
					className="px-8 max-md:w-full"
				/>
			) : (
				<GoogleButton
					className="px-8 max-md:w-full"
					callbackUrl={href}
				/>
			)}
		</div>
	);
}

interface LoggedProps {
	email: string;
	callbackUrl?: string;
}

export function Logged({ email, callbackUrl }: LoggedProps) {
	const [isPending, startTransition] = useTransition();

	return (
		<Panel type="success" showIcon>
			<div className="flex items-center justify-between">
				<span>
					Você está logado como <strong>{email}</strong>.
				</span>
				<Button
					variant="ghost"
					size={"icon"}
					type="button"
					onClick={() =>
						startTransition(async () => {
							await signOutAction(callbackUrl);
						})
					}
					disabled={isPending}
					title="Sair"
				>
					{isPending ? (
						<LoaderCircle className="h-4 w-4 animate-spin" />
					) : (
						<LogOut className="h-4 w-4" />
					)}
				</Button>
			</div>
		</Panel>
	);
}
