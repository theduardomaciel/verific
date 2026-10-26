"use client";

import Link from "next/link";
import { useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { authClient } from "@/lib/auth-client";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { setSessionMarker } from "@/lib/session-marker";
import { cn } from "@/lib/utils";
import GoogleLogo from "@/public/icons/google.svg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	callbackUrl: string;
}

export default function GoogleButton({
	callbackUrl,
	disabled,
	className,
	...rest
}: ButtonProps) {
	const [loading, setLoading] = useState(false);

	async function handleSignIn() {
		setLoading(true);
		setSessionMarker();
		const { error } = await authClient.signIn.social({
			provider: "google",
			callbackURL: safeRedirectPath(callbackUrl, "/account"),
		});
		if (error) {
			setLoading(false);
			toast.error(
				error.status === 429
					? "Muitas tentativas de login. Tente de novo em alguns segundos."
					: "Não foi possível iniciar o login. Tente de novo.",
			);
		}
	}

	return (
		<Button
			type="button"
			className={cn("h-fit w-full py-2.5", className)}
			variant={"outline"}
			onClick={() => void handleSignIn()}
			disabled={disabled || loading}
			{...rest}
		>
			{loading ? (
				<Loader2 className="mr-2 h-4 w-4 animate-spin" />
			) : (
				<GoogleLogo className="mr-2" />
			)}
			Continuar com Google
		</Button>
	);
}

export function ContinueRegistrationButton({
	className,
	...rest
}: ButtonProps) {
	return (
		<Button
			variant={"default"}
			type="button"
			className={cn("inline-flex gap-3 px-3 py-5", className)}
			{...rest}
		>
			<Link
				className="text-foreground text-sm font-medium"
				href={"/join"}
			>
				Continuar cadastro
			</Link>
		</Button>
	);
}
