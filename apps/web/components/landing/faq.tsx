"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export function Faq() {
	return (
		<section
			id="faq"
			className="px-landing container py-12 md:py-16 lg:py-24"
		>
			<div className="grid gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
				<div>
					<Badge className="mb-6 rounded-full px-4 py-1.5 font-semibold">
						FAQ
					</Badge>
					<h2 className="text-primary mb-2 text-xl font-bold md:text-2xl">
						Alguma dúvida?
					</h2>
					<h3 className="mb-4 text-3xl font-bold md:text-4xl">
						Deixa que a gente responde!
					</h3>
					<p className="text-muted-foreground mb-6">
						Lorem ipsum dolor sit amet, consectetur adipiscing elit,
						sed do eiusmod tempor incididunt ut labore et dolore
						magna aliqua.
					</p>
				</div>

				<div>
					<Accordion type="single" collapsible className="w-full">
						<AccordionItem value="item-1">
							<AccordionTrigger>
								O que é o verifIC?
							</AccordionTrigger>
							<AccordionContent>
								O verifIC é um sistema web gratuito para
								credenciamento, gerenciamento e certificação de
								eventos. Ele foi criado para atender, dentre um
								vasta gama, organizações de menor porte que não
								têm acesso a soluções comerciais robustas.
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="item-2">
							<AccordionTrigger>
								Quais funcionalidades o verifIC oferece?
							</AccordionTrigger>
							<AccordionContent>
								O verifIC oferece funcionalidades como
								gerenciamento de participantes, credenciamento,
								emissão de certificados, controle de presença, e
								muito mais.
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="item-3">
							<AccordionTrigger>
								O sistema envia certificados automaticamente?
							</AccordionTrigger>
							<AccordionContent>
								Sim, o sistema pode enviar certificados
								automaticamente para os participantes após a
								conclusão do evento.
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="item-4">
							<AccordionTrigger>
								Como funciona o acesso ao sistema?
							</AccordionTrigger>
							<AccordionContent>
								O acesso ao sistema é feito através de um
								cadastro simples, onde você pode criar sua conta
								e começar a usar imediatamente.
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="item-5">
							<AccordionTrigger>
								Meus dados estão seguros?
							</AccordionTrigger>
							<AccordionContent>
								Sim, todos os dados são armazenados com
								segurança e criptografia, seguindo as melhores
								práticas de proteção de dados.
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="item-6">
							<AccordionTrigger>
								O verifIC é gratuito mesmo?
							</AccordionTrigger>
							<AccordionContent>
								Sim, o verifIC é completamente gratuito para
								uso, sem custos ocultos ou limitações
								artificiais.
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="item-7">
							<AccordionTrigger>
								Preciso instalar algo para usar o sistema?
							</AccordionTrigger>
							<AccordionContent>
								Não, o verifIC é uma aplicação web que funciona
								diretamente no navegador, sem necessidade de
								instalação.
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="item-8">
							<AccordionTrigger>
								Posso usar o verifIC em qualquer tipo de evento?
							</AccordionTrigger>
							<AccordionContent>
								Sim, o verifIC foi projetado para ser flexível e
								atender a diversos tipos de eventos, desde
								pequenas reuniões até grandes conferências.
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="item-9">
							<AccordionTrigger>
								O sistema é open source?
							</AccordionTrigger>
							<AccordionContent>
								Sim, o verifIC é um projeto open source, o que
								significa que você pode contribuir para o seu
								desenvolvimento ou adaptá-lo às suas
								necessidades específicas.
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</div>
			</div>
		</section>
	);
}
