import Image from "next/image";
import {
	Calendar,
	MapPin,
	Share2,
	Mail,
	Flag,
	Check,
	TicketCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function EventPage({
	params,
}: Readonly<{ params: { id: string } }>) {
	const fetched = await params;
	const id = fetched.id;

	return (
		<main className="bg-background min-h-screen">
			{/* Hero Section */}
			<section className="from-primary bg-primary px-landing border-secondary relative w-full border-b-[10px] py-12">
				<div className="container-p z-10 mx-auto flex w-full flex-col gap-8 md:flex-row">
					<div className="z-10 flex flex-1 flex-col items-start justify-center">
						<h1 className="mb-4 text-5xl font-bold text-white">
							SECOMP 2024
						</h1>
						<div className="mb-6 flex items-center text-lg text-white/90">
							<Calendar className="mr-2 h-4.5 w-4.5" />
							<span className="-mt-0.5 text-base">
								De 18/01/2024 a 27/01/2024
							</span>
						</div>

						<div className="mb-8 flex flex-wrap gap-3">
							<Badge
								variant={"secondary"}
								className="text-primary rounded-xl bg-white px-4 py-1.5"
							>
								<Check className="mr-2 !h-4 !w-4" />
								<span>Aberto para o público externo</span>
							</Badge>
							<Badge
								variant={"secondary"}
								className="text-primary rounded-xl bg-white px-4 py-1.5"
							>
								<TicketCheck className="mr-2 !h-4 !w-4" />
								<span>Emite certificado</span>
							</Badge>
						</div>

						<Button asChild size={"lg"} variant={"secondary"}>
							<Link
								href={`/event/${id}/subscribe`}
								className="h-fit !px-12 py-3 text-base font-semibold text-white max-md:w-full"
							>
								INSCREVER-SE
							</Link>
						</Button>
					</div>

					{/* Share card */}
					<div className="relative z-20 flex items-center justify-center">
						<Image
							src="/images/cover.png"
							alt="SECOMP24"
							width={400}
							height={240}
							className="border-primary max-w-md overflow-hidden rounded-3xl border-2"
						/>
						<Button className="absolute -bottom-4 left-1/2 h-10 -translate-x-1/2 !px-6">
							<Share2 className="h-5 w-5" />
							<span>Compartilhar</span>
						</Button>
					</div>
				</div>

				<Image
					src={"/images/hero-bg.png"}
					className="z-0 object-cover"
					alt="Background"
					fill
				/>
			</section>

			{/* Content Section */}
			<section className="px-landing py-12">
				<div className="relative container mx-auto flex flex-col gap-16 lg:flex-row">
					<div className="lg:w-2/3">
						<h2 className="mb-6 text-2xl font-bold">
							Descrição do Evento
						</h2>

						<div className="space-y-6">
							<p>
								A SECOMP 2025 —{" "}
								<strong>Semana da Computação da UFAL</strong> —
								é o maior evento acadêmico de tecnologia de
								Alagoas, reunindo estudantes, professores,
								profissionais da área e entusiastas da
								tecnologia para três dias de intensa troca de
								conhecimento, experiências e networking. Em sua
								edição deste ano, que acontece de{" "}
								<strong>6 a 8 de novembro de 2025</strong>, o
								evento será realizado no Instituto de Computação
								da UFAL, em Maceió, e promete uma programação
								diversa, interativa e completamente gratuita.
							</p>

							<p>
								Com foco em inovação, aprendizado e
								desenvolvimento de habilidades técnicas, a
								SECOMP traz palestras com grandes nomes da
								tecnologia em Alagoas, minicursos práticos,
								salas de jogos e competições empolgantes, tudo
								pensado para ampliar o contato entre a
								comunidade acadêmica e o mercado de trabalho.
							</p>

							<p className="font-medium">
								Entre os destaques da programação:
							</p>

							<ul className="list-none space-y-6">
								<li>
									<div className="flex items-start">
										<span className="mr-2">🎯</span>
										<div>
											<strong>
												Competições Técnicas e de
												Raciocínio
											</strong>
											<ul className="mt-2 list-disc space-y-3 pl-6">
												<li>
													<strong>
														Maratona de Programação:
													</strong>{" "}
													Desafie sua lógica e
													trabalho em equipe na
													tradicional competição
													algorítmica da SECOMP.
												</li>
												<li>
													<strong>
														Campeonato de Xadrez:
													</strong>{" "}
													Promovido pelo grupo de
													extensão iChess, teste suas
													habilidades estratégicas
													frente a outros
													competidores.
												</li>
												<li>
													<strong>
														Campeonato de Yu-Gi-Oh!:
													</strong>{" "}
													Os duelos de cartas estão de
													volta! Mostre sua maestria
													neste clássico universo.
												</li>
											</ul>
										</div>
									</div>
								</li>

								<li>
									<div className="flex items-start">
										<span className="mr-2">📝</span>
										<div>
											<strong>
												Minicursos e Palestras:
											</strong>{" "}
											Aprenda com especialistas sobre
											temas que vão do desenvolvimento de
											software à inteligência artificial,
											passando por segurança da
											informação, design, startups e muito
											mais.
										</div>
									</div>
								</li>

								<li>
									<div className="flex items-start">
										<span className="mr-2">🎮</span>
										<div>
											<strong>Sala de Jogos:</strong> Um
											espaço descontraído para conhecer
											novas pessoas, se divertir e relaxar
											com jogos de tabuleiro, consoles e
											interações livres.
										</div>
									</div>
								</li>
							</ul>

							<p>
								A SECOMP é aberta ao público e indicada para
								todos os níveis de conhecimento, desde
								iniciantes até profissionais. Mas atenção:{" "}
								<strong>
									as vagas para atividades são limitadas
								</strong>
								, então fique de olho nos formulários de
								inscrição para garantir sua participação!
							</p>

							<p>
								<span className="mr-2">📅</span> Data: 6 a 8 de
								novembro de 2025
								<br />
								<span className="mr-2">📍</span> Local:
								Instituto de Computação, UFAL - Maceió, AL
							</p>

							<p className="font-medium">
								Participe da SECOMP 2025 e viva essa experiência
								única de tecnologia, aprendizado e conexão!
							</p>
						</div>
					</div>

					<div className="sticky top-16 right-0 lg:w-1/3">
						<div className="mb-6 rounded-lg border p-6">
							<h3 className="mb-4 text-xl font-medium">Local</h3>
							<p className="mb-4">
								Av. Lourival Melo Mota, S/N - Cidade
								Universitária, Maceió - AL, 57072-970
							</p>
							<Button
								variant="outline"
								className="flex w-full items-center justify-center gap-2"
							>
								<MapPin className="h-4 w-4" />
								<span>Ver no mapa</span>
							</Button>
						</div>

						<div className="flex flex-col rounded-lg border p-6">
							<h3 className="mb-4 text-xl font-medium">
								Sobre o produtor
							</h3>
							<p className="mb-4">
								Liga Acadêmica de Computação (LACOMP) - UFAL
							</p>
							<Button
								variant="outline"
								className="flex w-full items-center justify-center gap-2"
							>
								<Mail className="h-4 w-4" />
								<span>Falar com o produtor</span>
							</Button>
						</div>

						<span className="flex w-full items-end justify-end">
							<Button
								variant={"outline"}
								size={"lg"}
								className="mt-4 max-lg:w-full"
							>
								<Flag className="mr-2 h-4 w-4" />
								<span>Denunciar esse evento</span>
							</Button>
						</span>
					</div>
				</div>
			</section>
		</main>
	);
}
