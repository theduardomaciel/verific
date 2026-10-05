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
}

/**
 * Capa do evento.
 *
 * O texto é **sempre branco** e vive nas subcomponentes abaixo — a capa é
 * uma imagem, não uma cor de tema, então não há escolha de cor de texto.
 * O que o organizador controla é o véu: a cor (`--ev-hero-tint`, já
 * escurecida até atingir AA contra o branco em `resolve.ts`) e a opacidade
 * (`--ev-hero-overlay-opacity`).
 */
function HeroRoot({ children, coverUrl }: HeroProps) {
	return (
		<section className="relative flex w-full overflow-hidden py-24 text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.35)]">
			<div className="container-p z-10 mx-auto flex w-full flex-col gap-8 md:flex-row">
				{children}
			</div>

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
			<div aria-hidden className={cn("absolute inset-0 z-[1]", HERO_BASE_SCRIM)} />
			{/* Camada 2: cor escolhida no tema, na opacidade escolhida. */}
			<div
				aria-hidden
				className="absolute inset-0 z-[1]"
				style={{
					background: "var(--ev-hero-tint, var(--primary))",
					opacity: "var(--ev-hero-overlay-opacity, 0.45)",
				}}
			/>
		</section>
	);
}

/** Título principal da capa (`h1`). */
function HeroTitle({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<h1 className={cn("font-heading mb-4 text-5xl font-bold", className)}>
			{children}
		</h1>
	);
}

/** Linha de metadados da capa (datas, badges): branco a 90%. */
function HeroMeta({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("text-white/90 mb-4 flex items-center text-lg", className)}>
			{children}
		</div>
	);
}

/** Parágrafo de apoio da capa: branco a 90%, meia largura no desktop. */
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
				"text-white/90 text-base font-semibold md:max-w-md",
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
					opacity: "var(--ev-top-opacity, 0)",
				}}
			/>
			<div
				className="absolute inset-x-0 bottom-0 w-full"
				style={{
					height: "var(--ev-bottom-height, 0px)",
					backgroundImage: "var(--ev-bottom-gradient, none)",
					opacity: "var(--ev-bottom-opacity, 0)",
				}}
			/>
		</div>
	);
}
