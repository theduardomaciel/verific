import { cn } from "@/lib/utils";
import Image from "next/image";

interface HolderProps {
	className?: string;
	children: React.ReactNode;
}

export function Holder({ children, className }: HolderProps) {
	return (
		<main className={cn("bg-background min-h-screen", className)}>
			{children}
		</main>
	);
}

/**
 * Véu base da capa: um preto fixo que independe da cor escolhida pelo
 * organizador. Garante um piso de escurecimento para o texto branco ficar
 * legível sobre qualquer imagem, antes mesmo do tom de tema por cima.
 */
export const HERO_BASE_SCRIM = "bg-black/40";

/** Fallback da capa quando o evento não tem imagem própria. */
export const HERO_FALLBACK_COVER = "/images/hero-bg.png";

interface HeroProps {
	children: React.ReactNode;
	coverUrl?: string | null;
	/** `false`: sem imagem — a capa não renderiza fundo nem véu e o texto
	 * herda a cor da página (o tom vem do gradiente `hero`). */
	showImage?: boolean;
}

/**
 * Altura fixa do cabeçalho do evento (`h-21` no layout): a camada do
 * gradiente `hero` estende a capa para cima nesse exato valor, cobrindo
 * cabeçalho + capa e terminando no filete. Se a altura do cabeçalho mudar,
 * este valor acompanha.
 */
const HEADER_H = "5.25rem";

/**
 * Capa do evento.
 *
 * Com imagem: o texto é **sempre branco** e vive nas subcomponentes abaixo
 * — a capa é uma imagem, não uma cor de tema, então não há escolha de cor
 * de texto. O que o organizador controla é o véu: a cor
 * (`--ev-hero-tint`, já escurecida até atingir AA contra o branco em
 * `resolve.ts`) e a opacidade (`--ev-hero-overlay-opacity`).
 *
 * Sem imagem (`showImage: false`): nenhuma camada de fundo ou véu é
 * renderizada e o texto usa `--ev-hero-fg` (a cor da página).
 *
 * O gradiente superior com `height: "hero"` vive aqui (não nos efeitos da
 * página): atrás de tudo, do topo da página até a borda inferior da capa,
 * onde o filete (`--ev-hero-border`) o encobre e ele "termina" com precisão.
 */
function HeroRoot({ children, coverUrl, showImage = true }: HeroProps) {
	return (
		<section
			className={cn(
				"relative flex w-full py-24",
				showImage &&
					"overflow-hidden text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.35)]",
			)}
		>
			{/* Gradiente "hero": inerte (`none`) salvo com `height: "hero"`. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 bottom-0 -z-10"
				style={{
					top: `calc(-1 * ${HEADER_H})`,
					backgroundImage: "var(--ev-hero-bg, none)",
				}}
			/>
			<div className="container-p z-10 mx-auto flex w-full flex-col gap-8 md:flex-row">
				{children}
			</div>

			{showImage && (
				<>
					<Image
						src={coverUrl || HERO_FALLBACK_COVER}
						className="z-0 object-cover"
						alt=""
						aria-hidden
						fill
						loading="eager"
						sizes="100vw"
					/>
					{/* Camada 1: véu base fixo (piso de contraste). */}
					<div
						aria-hidden
						className={cn("absolute inset-0 z-[1]", HERO_BASE_SCRIM)}
					/>
					{/* Camada 2: cor escolhida no tema, na opacidade escolhida. */}
					<div
						aria-hidden
						className="absolute inset-0 z-[1]"
						style={{
							background: "var(--ev-hero-tint, var(--primary))",
							opacity: "var(--ev-hero-overlay-opacity, 0.45)",
						}}
					/>
				</>
			)}
			{/* Filete na borda inferior da capa (altura 0 = sem filete). */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 bottom-0"
				style={{
					height: "var(--ev-hero-border-width, 0px)",
					background: "var(--ev-hero-border, transparent)",
				}}
			/>
		</section>
	);
}

/** Título principal da capa (`h1`): branco sobre imagem, página sem imagem. */
function HeroTitle({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<h1
			className={cn(
				"font-heading text-(--ev-hero-fg) mb-4 text-5xl font-bold",
				className,
			)}
		>
			{children}
		</h1>
	);
}

/** Linha de metadados da capa (datas, badges): versão suave do título. */
function HeroMeta({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"text-(--ev-hero-fg-soft) mb-4 flex items-center text-lg",
				className,
			)}
		>
			{children}
		</div>
	);
}

/** Parágrafo de apoio da capa: suave, meia largura no desktop. */
function HeroDescription({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<p
			className={cn(
				"text-(--ev-hero-fg-soft) text-base font-semibold md:max-w-md",
				className,
			)}
		>
			{children}
		</p>
	);
}

export const Hero = Object.assign(HeroRoot, {
	Title: HeroTitle,
	Meta: HeroMeta,
	Description: HeroDescription,
});

/**
 * Período do evento ("De X a Y"), em pt-BR. Compartilhado pelas páginas de
 * evento que repetiam esse bloco dentro da capa.
 */
export function EventDateRange({
	startDate,
	endDate,
}: {
	startDate: string | Date;
	endDate: string | Date;
}) {
	const format = (value: string | Date) =>
		new Date(value).toLocaleDateString("pt-BR");

	return (
		<>
			De {format(startDate)} a {format(endDate)}
		</>
	);
}

export function Content({ children, className }: HolderProps) {
	return (
		<div
			className={cn(
				"mx-auto flex w-full flex-col items-center justify-center py-16",
				className,
			)}
		>
			{children}
		</div>
	);
}

/**
 * Efeitos de fundo da página do evento (grade/pontos/sólido + gradientes
 * superior/inferior), 100% dirigidos pelas variáveis do tema.
 * `pointer-events-none`: nunca intercepta cliques.
 *
 * A opacidade dos gradientes já vem embutida em cada parada (`color-mix`
 * em `resolve.ts`), então aqui não há véu de opacidade — ele escureceria
 * duas vezes. O gradiente superior com `height: "hero"` não renderiza aqui
 * (altura zero): a própria capa o desenha, de trás do cabeçalho até o
 * filete.
 */
export function EventBackgroundEffects() {
	return (
		<div aria-hidden className="pointer-events-none absolute inset-0 z-0">
			<div
				className="absolute inset-0"
				style={{
					backgroundImage: "var(--ev-bg-image, none)",
					backgroundSize: "var(--ev-bg-size, 32px 32px)",
					opacity: "var(--ev-bg-opacity, 0)",
				}}
			/>
			<div
				className="absolute inset-x-0 top-0 w-full"
				style={{
					height: "var(--ev-top-height, 0px)",
					backgroundImage: "var(--ev-top-gradient, none)",
				}}
			/>
			<div
				className="absolute inset-x-0 bottom-0 w-full"
				style={{
					height: "var(--ev-bottom-height, 0px)",
					backgroundImage: "var(--ev-bottom-gradient, none)",
				}}
			/>
		</div>
	);
}
