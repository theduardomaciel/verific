import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function Hero() {
	return (
		<section className="bg-primary flex w-full justify-center">
			<div className="container w-full px-4 py-12 md:py-16 lg:py-20">
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
							className="group text-foreground hover:bg-accent h-fit rounded-full bg-white !px-12 !py-4 font-semibold dark:bg-black dark:hover:bg-black/80"
							size={"lg"}
						>
							<span>Comece a organizar seu evento</span>
							<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
						</Button>
					</Link>
				</div>
			</div>
		</section>
	);
}
