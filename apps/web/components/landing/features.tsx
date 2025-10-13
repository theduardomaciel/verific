import { Badge } from "@/components/ui/badge";

export function Features() {
	return (
		<section
			id="features"
			// GAMBIARRA: o original é "pt-16", mas para a âncora funcionar corretamente,
			// somamos o offset que queremos que a âncora tenha (neste caso, 8 * 4 = 32px)
			// e subtraímos esse valor com margin-top negativo
			className="px-landing container-p -mt-8 w-full gap-9 pt-24"
		>
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
					Organize, comunique e gerencie cada detalhe do seu evento
					com praticidade. Nossa plataforma reúne tudo o que você
					precisa — do cadastro de participantes à interação em tempo
					real — para tornar sua experiência mais simples, eficiente e
					memorável.
				</p>
			</div>
		</section>
	);
}
