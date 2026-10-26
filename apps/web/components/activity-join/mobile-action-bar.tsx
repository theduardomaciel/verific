"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

interface MobileActionBarProps {
	/** Id do card de inscrição observado (some quando ele entra em vista). */
	cardId: string;
	/** Id do título do card (alvo do scroll + foco). */
	headingId: string;
	seatsLabel: string | null;
	seatsUrgent?: boolean;
	/** `true` em qualquer estado não acionável (ou após o envio). */
	hidden: boolean;
	actionLabel?: string;
}

/**
 * Barra fixa de ação no mobile: status das vagas + a ação do painel,
 * rolando até o card e focando o título. Desliza para fora quando o
 * card está visível ou o painel não é acionável.
 */
export function MobileActionBar({
	cardId,
	headingId,
	seatsLabel,
	seatsUrgent = false,
	hidden,
	actionLabel = "Inscrever-se",
}: MobileActionBarProps) {
	const [cardInView, setCardInView] = useState(true);

	useEffect(() => {
		const card = document.getElementById(cardId);
		if (!card) return;
		const observer = new IntersectionObserver(
			([entry]) => setCardInView(Boolean(entry?.isIntersecting)),
			{ threshold: 0.2 },
		);
		observer.observe(card);
		return () => observer.disconnect();
	}, [cardId]);

	function goToForm(): void {
		const reduceMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		document.getElementById(cardId)?.scrollIntoView({
			behavior: reduceMotion ? "auto" : "smooth",
			block: "start",
		});
		window.setTimeout(
			() => {
				document
					.getElementById(headingId)
					?.focus({ preventScroll: true });
			},
			reduceMotion ? 0 : 350,
		);
	}

	const visible = !hidden && !cardInView;

	return (
		<div
			aria-hidden={!visible}
			className={cn(
				"bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur lg:hidden",
				// translate (não transform): é a propriedade que o
				// translate-y-* do Tailwind v4 gera. visibility segura o
				// elemento na árvore até o fim da transição: deslizar para
				// dentro e para fora some só no fim do movimento, e oculto
				// já sai do fluxo de foco.
				"motion-safe:transition-[visibility,translate] motion-safe:duration-300",
				visible
					? "visible translate-y-0"
					: "invisible translate-y-full",
			)}
		>
			{/* Inset seguro é 0 fora de telas com viewport-fit=cover: o
				max garante ao menos o espaçamento do py-3. */}
			<div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
				{seatsLabel ? (
					<p
						className={cn(
							"text-muted-foreground text-sm",
							seatsUrgent && "font-bold",
						)}
					>
						{seatsLabel}
					</p>
				) : (
					<span />
				)}
				<Button
					type="button"
					size="lg"
					onClick={goToForm}
					className="min-h-11 shrink-0"
				>
					{actionLabel}
				</Button>
			</div>
		</div>
	);
}
