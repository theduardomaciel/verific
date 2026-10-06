import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import Logo from "@/public/logo.svg";
import Ticket from "@/public/ticket.svg";
import GoogleButton from "@/components/auth/GoogleButton";

export const metadata: Metadata = {
	title: "Autenticação",
};

async function LoginContent({
	searchParams,
}: {
	searchParams: Promise<{ callbackUrl?: string }>;
}) {
	const params = await searchParams;
	const callbackUrl = params.callbackUrl?.startsWith("/")
		? params.callbackUrl
		: "/account";

	return (
		<div className="flex min-h-screen flex-col md:flex-row">
			<div className="bg-primary relative flex flex-col justify-center gap-4 overflow-hidden rounded-b-lg bg-[linear-gradient(180deg,#2563EB_0%,#3B82F6_100%)] p-6 text-white md:m-8 md:w-1/2 md:justify-between md:rounded md:p-12">
				<h1 className="font-dashboard z-10 hidden text-4xl leading-[110%] font-extrabold tracking-normal text-white md:flex md:text-6xl">
					Tecnologia de eventos ao seu alcance
				</h1>
				<Ticket className="absolute -right-48 bottom-48 z-0 rotate-12 md:-bottom-36" />
				<div className="relative z-10 flex flex-col gap-3 max-md:py-6 md:items-start">
					<Logo className="h-10 md:h-8" />
					<p className="hidden text-xs leading-none font-normal tracking-normal text-white/90 opacity-80 md:flex">
						Copyright 2025 verifIC. Todos os direitos reservados
					</p>
				</div>
			</div>

			<div className="flex w-full flex-1 flex-col items-center justify-center p-8 md:w-1/2">
				<div className="flex w-full max-w-sm flex-col items-center justify-center gap-6 max-md:pb-8">
					<div className="flex flex-col items-center justify-center gap-2">
						<h3 className="font-dashboard foreground mb-2 text-center text-2xl font-bold">
							Autenticação
						</h3>
						<p className="text-muted-foreground text-center text-sm">
							Entre com seu e-mail institucional para
							<br />
							acessar a plataforma
						</p>
					</div>

					<GoogleButton callbackUrl={callbackUrl} />

					<p className="text-muted-foreground text-center text-sm">
						Ao continuar, você concorda com nossos
						<br />
						<Link
							href="/terms"
							className="text-muted-foreground hover:text-foreground text-sm hover:underline"
						>
							Termos de Serviço
						</Link>{" "}
						e{" "}
						<Link
							href="/privacy"
							className="text-muted-foreground hover:text-foreground text-sm hover:underline"
						>
							Política de Privacidade
						</Link>
						.
					</p>
					<footer className="absolute bottom-0 left-1/2 flex w-full max-w-[50%] -translate-x-1/2 items-center justify-center pb-8 md:hidden">
						<p className="text-center text-xs opacity-20">
							Copyright 2025 verifIC. Todos os direitos reservados
						</p>
					</footer>
				</div>
			</div>
		</div>
	);
}

export default function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ callbackUrl?: string }>;
}) {
	return (
		<Suspense fallback={<div className="min-h-screen" />}>
			<LoginContent searchParams={searchParams} />
		</Suspense>
	);
}
