import Link from "next/link";
import type { Metadata } from "next";

// Icons
import Logo from "@/public/logo.svg";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

// Components

export const metadata: Metadata = {
	title: "Autenticação",
};

const randomPhrases = ["404", "not found", "não encontrado"];

export default function NotFoundPage() {
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
					<h1 className="font-sans text-6xl font-black">404</h1>
					<div className="flex flex-col items-start justify-start gap-6">
						<h2 className="text-3xl leading-[95%] font-bold">
							Ops… Não encontramos o que você estava procurando
						</h2>
						<p>
							A página que você procurou (ainda) não existe.
							<br /> Volte para o início e continue gerenciando
							seus eventos com a gente.
						</p>
						<Button size={"lg"} asChild>
							<Link href={`/`}>
								<ArrowLeftIcon />
								Voltar para o início
							</Link>
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
