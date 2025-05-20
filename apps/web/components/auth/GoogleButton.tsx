"use client";

import { useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

// Icons
import { Loader2 } from "lucide-react";
import GoogleLogo from "@/public/icons/google.svg";

// Components
import { Button } from "@/components/ui/button";

// Actions
import { login } from "@/app/auth/actions";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	callbackUrl?: string;
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

		login(callbackUrl);
	}

	return (
		<Button
			type="button"
			className={cn("h-fit w-full py-2.5", className)}
			variant={"outline"}
			onClick={handleSignIn}
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
