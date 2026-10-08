"use client";

import { useEffect, useState } from "react";

// Components
import { Button } from "@/components/ui/button";

// Lib
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
}

/**
 * Barra fixa de ação no mobile: status das vagas + "Inscrever-se",
 * rolando até o card e focando o título. Some quando o card está
 * visível ou o painel não é acionável.
 */
export function MobileActionBar({
	cardId,
	headingId,
	seatsLabel,
	seatsUrgent = false,
	hidden,
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

	if (hidden || cardInView) return null;

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

	return (
		<div className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur lg:hidden">
			<div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 pb-[env(safe-area-inset-bottom)]">
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
					Inscrever-se
				</Button>
			</div>
		</div>
	);
}
