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

interface EventHeroProps {
	children: React.ReactNode;
	coverUrl?: string | null;
}

export async function Hero({ children, coverUrl }: EventHeroProps) {
	// const teste = await new Promise((r) => setTimeout(r, 500));

	return (
		<section className="relative flex w-full overflow-hidden py-24">
			<div className="container-p z-10 mx-auto flex w-full flex-col gap-8 md:flex-row">
				{children}
			</div>

			<Image
				src={coverUrl || "/images/hero-bg.png"}
				className="z-0 object-cover"
				alt="Capa do evento"
				aria-hidden
				fill
				loading="eager"
				sizes="100vw"
			/>
			<div
				aria-hidden
				className="bg-primary absolute inset-0 z-[1]"
				style={{ opacity: "var(--ev-hero-overlay-opacity, 0.45)" }}
			/>
		</section>
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
