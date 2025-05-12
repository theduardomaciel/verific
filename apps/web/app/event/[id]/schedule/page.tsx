import Image from "next/image";
import { Calendar } from "lucide-react";

// Components
import { EventCard } from "@/components/landing/event-card";
import { SearchBar } from "@/components/dashboard/search-bar";
import { SortBy } from "@/components/dashboard/sort-by";

export default function EventSchedulePage() {
	return (
		<main className="bg-background min-h-screen">
			{/* Hero Section */}
			<section className="from-primary bg-primary px-landing border-secondary relative w-full border-b-[10px] py-12">
				<div className="z-10 container mx-auto flex w-full flex-col gap-8 md:flex-row">
					<div className="z-10 flex flex-1 flex-col items-start justify-center">
						<div className="mb-4 flex items-center text-lg text-white/90">
							<Calendar className="mr-2 h-4.5 w-4.5" />
							<span className="-mt-0.5 text-base">
								De 18/01/2024 a 27/01/2024
							</span>
						</div>
						<h1 className="mb-4 text-5xl font-bold text-white">
							Programação
						</h1>
						<p className="text-primary-foreground/90 text-base font-semibold md:max-w-md">
							Acompanhe as próximas atividades da SECOMP 2025,
							tanto internas, como externas, e saiba quando
							participar!
						</p>
					</div>
				</div>

				<Image
					src={"/images/hero-bg.png"}
					className="z-0 object-cover"
					alt="Background"
					fill
				/>
			</section>
			<div className="px-landing mx-auto flex w-full max-w-6xl flex-col items-center justify-center pt-16">
				<div className="container mb-8 flex flex-col justify-between gap-4 md:flex-row">
					<SearchBar placeholder="Pesquisar atividades" />
					<div className="flex gap-4">
						<SortBy
							sortBy={"recent"}
							items={[
								{ value: "recent", label: "Mais recentes" },
								{ value: "oldest", label: "Mais antigas" },
								{ value: "alphabetical", label: "Alfabética" },
							]}
						/>
						<SortBy
							sortBy={"all"}
							items={[
								{ value: "all", label: "Todas as categorias" },
								{ value: "workshop", label: "Workshop" },
								{ value: "seminar", label: "Seminário" },
								{ value: "lecture", label: "Palestra" },
								{
									value: "round-table",
									label: "Roda de conversa",
								},
								{ value: "championship", label: "Campeonato" },
							]}
						/>
					</div>
				</div>

				<div className="container mb-10">
					<h2 className="mb-4 text-xl font-bold">08/11</h2>
					<div className="grid gap-6 md:grid-cols-2">
						<EventCard
							type="PALESTRA"
							title="Tecnologias e recursos didáticos aplicados na Matemática Inclusiva"
							description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur nulla felis, lacinia ac urna a, egestas euismod odio. Sed vestibulum dictum mi, sed euismod purus sollicitudin non."
							presenterName="Ranilson Oscar Araújo Paiva"
							presenterDesc="Docente no Instituto de Matemática e especialista em validação ético jurídica de modelos de inteligência artificial"
							availableSpots="10 vagas disponíveis"
							date="08/11"
							time="09h00"
							buttonColor="bg-[#5b15b5]"
							buttonHoverColor="hover:bg-[#4a1194]"
						/>
						<EventCard
							type="RODA DE CONVERSA"
							title="Tecnologias e recursos didáticos aplicados na Matemática Inclusiva"
							description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur nulla felis, lacinia ac urna a, egestas euismod odio. Sed vestibulum dictum mi, sed euismod purus sollicitudin non."
							presenterName="Ranilson Oscar Araújo Paiva"
							presenterDesc="Docente no Instituto de Matemática e especialista em validação ético jurídica de modelos de inteligência artificial"
							status="ESGOTADO"
							date="08/11"
							time="09h00"
							buttonColor="bg-gray-300"
							buttonHoverColor="hover:bg-gray-400"
						/>
					</div>

					<div className="mt-6">
						<EventCard
							type="CAMPEONATO"
							title="5ª Maratona de Programação do GEMA"
							description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur nulla felis, lacinia ac urna a, egestas euismod odio. Sed vestibulum dictum mi, sed euismod purus sollicitudin non."
							presenterName="GEMA"
							presenterDesc="Criado em XXXX, é o Grupo de Extensão em Maratonas de Programação do Instituto de Computação da UFAL"
							availableSpots="10 vagas disponíveis"
							date="08/11"
							time="09h00"
							buttonColor="bg-[#5b15b5]"
							buttonHoverColor="hover:bg-[#4a1194]"
						/>
					</div>
				</div>

				<div className="container mb-10">
					<h2 className="mb-4 text-xl font-bold">09/11</h2>
					<div className="grid gap-6 md:grid-cols-2">
						<EventCard
							type="SEMINÁRIO"
							title="Inovações e metodologias no ensino da Matemática Inclusiva"
							description="Descubra novas abordagens para a Matemática Inclusiva. Junte-se a nós para uma discussão enriquecedora sobre práticas inovadoras e recursos didáticos que fazem a diferença."
							presenterName="Marcos Vinicius da Silva"
							presenterDesc="Professor no Centro de Matemática e especialista em ética na inteligência artificial."
							availableSpots="15 vagas disponíveis"
							date="09/11"
							time="10h00"
							buttonColor="bg-[#5b15b5]"
							buttonHoverColor="hover:bg-[#4a1194]"
						/>
						<EventCard
							type="PALESTRA"
							title="Inovações e metodologias no ensino da Matemática Inclusiva"
							description="Participe de um seminário interativo sobre as melhores práticas no ensino da Matemática Inclusiva, com especialistas na área."
							presenterName="Marcos Vinicius da Silva"
							presenterDesc="Professor no Centro de Matemática e especialista em ética na inteligência artificial."
							availableSpots="15 vagas disponíveis"
							date="09/11"
							time="10h00"
							buttonColor="bg-[#5b15b5]"
							buttonHoverColor="hover:bg-[#4a1194]"
						/>
						<EventCard
							type="SEMINÁRIO"
							title="Inovações e metodologias no ensino da Matemática Inclusiva"
							description="Este seminário é uma oportunidade única para explorar novas ideias e práticas que podem transformar o ensino da Matemática Inclusiva."
							presenterName="Marcos Vinicius da Silva"
							presenterDesc="Professor no Centro de Matemática e especialista em ética na inteligência artificial."
							status="VAGAS ESGOTADAS"
							date="09/11"
							time="10h00"
							buttonColor="bg-gray-300"
							buttonHoverColor="hover:bg-gray-400"
						/>
						<EventCard
							type="WORKSHOP"
							title="Tendências e práticas inovadoras no ensino da Matemática Inclusiva"
							description="Participe e descubra as novas abordagens e ferramentas que estão transformando o ensino da Matemática Inclusiva."
							presenterName="Ana Clara Oliveira"
							presenterDesc="Educadora no Instituto de Matemática e especialista em inclusão digital."
							availableSpots="20 vagas disponíveis"
							date="09/11"
							time="14h00"
							buttonColor="bg-[#5b15b5]"
							buttonHoverColor="hover:bg-[#4a1194]"
						/>
					</div>
				</div>
			</div>
		</main>
	);
}
