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

export function Hero({ children, coverUrl }: EventHeroProps) {
	return (
		<section className="from-primary bg-primary px-landing border-secondary relative w-full border-b-[10px] py-24">
			<div className="container-p z-10 mx-auto flex w-full flex-col gap-8 md:flex-row">
				{children}
			</div>

			<Image
				src={coverUrl || "/images/hero-bg.png"}
				className="z-0 object-cover"
				alt="Background"
				fill
			/>
		</section>
	);
}

export function Content({ children, className }: HolderProps) {
	return (
		<div
			className={cn(
				"mx-auto flex w-full flex-col items-center justify-center pt-16",
				className,
			)}
		>
			{children}
		</div>
	);
}
