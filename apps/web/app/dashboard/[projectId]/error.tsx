"use client";

import type { Metadata } from "next";

// Icons
import Logo from "@/public/logo.svg";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

// Components

export const metadata: Metadata = {
	title: "Autenticação",
};

const randomPhrases = ["oops", "erro"];

export default function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	console.log(error, error.digest);

	return (
		<div className="flex min-h-screen flex-col md:flex-row">
			<div className="bg-primary relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-b bg-[linear-gradient(180deg,_#2563EB_0%,_#3B82F6_100%)] px-6 py-12 text-white md:m-8 md:w-1/2 md:rounded md:p-12">
				<Logo className="h-10 md:h-12" />
				<span className="pointer-events-none absolute top-1/2 left-1/2 z-10 hidden h-full w-[125%] -translate-x-1/2 -translate-y-1/2 flex-wrap items-center justify-center gap-6 text-[3vw] font-bold wrap-anywhere select-none md:flex">
					{Array.from({ length: 250 }, (_, i) => (
						<span
							key={i}
							className="block opacity-5"
							style={{
								letterSpacing: "0.05em",
							}}
						>
							{
								randomPhrases[
									Math.floor(
										Math.random() * randomPhrases.length,
									)
								]
							}
						</span>
					))}
				</span>
				<span className="absolute top-0 right-0 bottom-0 left-0 z-10 flex h-full w-full flex-wrap items-center justify-center gap-4 text-[6vw] font-bold select-none md:hidden">
					{Array.from({ length: 24 }, (_, i) => (
						<span
							key={i}
							className="block opacity-10"
							style={{
								letterSpacing: "0.03em",
							}}
						>
							{
								randomPhrases[
									Math.floor(
										Math.random() * randomPhrases.length,
									)
								]
							}
						</span>
					))}
				</span>
			</div>

			{/* Right Part */}
			<div className="flex w-full flex-1 flex-col items-center justify-center p-8 md:w-1/2">
				<div className="flex w-full max-w-sm flex-col items-start justify-center gap-6 max-md:pb-8">
					<div className="flex flex-col items-start justify-start gap-6">
						<h1 className="text-3xl leading-[95%] font-bold">
							Ops… algo deu errado nos nossso bastidores.
						</h1>
						<p>
							Estamos trabalhando nos ajustes — recarregue a
							página ou tente novamente em alguns instantes.
						</p>
						<span className="bg-muted w-full rounded-md border font-mono text-sm">
							{error.message && error.message}
						</span>
						<Button size={"lg"} onClick={() => reset()}>
							<ArrowLeftIcon />
							Tentar novamente
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
