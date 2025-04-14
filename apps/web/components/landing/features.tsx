import { Badge } from "@/components/ui/badge";

export function Features() {
	return (
		<section className="container w-full gap-9 px-4 pt-16">
			<div className="mb-6 flex justify-center">
				<Badge className="rounded-full px-4 py-1.5 font-semibold">
					Funcionalidades
				</Badge>
			</div>

			<div className="text-center">
				<h2 className="text-primary mb-2 text-2xl font-bold md:text-4xl">
					Simplifique seu evento.
				</h2>
				<h3 className="mb-4 text-3xl font-bold md:text-5xl">
					Eleve a experiência de todos!
				</h3>
				<p className="text-muted-foreground mx-auto max-w-2xl">
					Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
					do eiusmod tempor incididunt ut labore et dolore magna
					aliqua.
				</p>
			</div>
		</section>
	);
}
