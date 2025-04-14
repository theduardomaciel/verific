import Link from "next/link";

import { ArrowRight } from "lucide-react";
import Ticket from "@/public/ticket.svg";

import { Button } from "@/components/ui/button";

export function Hero() {
	return (
		<section className="bg-primary relative container mt-8 flex w-full justify-center rounded-2xl">
			<div className="container w-full p-8 md:p-10 lg:p-12">
				<div className="max-w-2xl">
					<h1 className="mb-4 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
						Seu próximo gerenciador de eventos
					</h1>
					<p className="mb-8 text-lg text-white/90">
						Tudo que você precisa para organizar, credenciar e
						certificar eventos — em um só lugar, de forma simples e
						gratuita.
					</p>
					<Link href="#">
						<Button
							className="group text-foreground hover:bg-accent h-fit rounded-full bg-white !px-12 !py-3 text-base font-semibold max-md:w-full dark:bg-black dark:hover:bg-black/80"
							size={"lg"}
						>
							<span className="hidden md:flex">
								Comece a organizar seu evento
							</span>
							<span className="flex md:hidden">
								Organize seu evento
							</span>
							<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
						</Button>
					</Link>
				</div>
			</div>
			<Ticket
				className="absolute -right-32 -bottom-48 z-0 hidden rotate-12 text-white lg:block"
				alt="Ticket"
			/>
		</section>
	);
}
