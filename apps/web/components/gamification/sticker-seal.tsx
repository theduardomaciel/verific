import { Lock } from "lucide-react";

import type {
	StickerIconKey,
	StickerTier,
} from "@verific/drizzle/gamification";
import { formatInstant } from "@verific/drizzle/time";

import { useEventTimeZone } from "@/components/event-time-zone";

import { cn } from "@/lib/utils";

import { StickerIcon } from "./sticker-icons";

export type StickerUnit =
	| "checkin"
	| "sessions"
	| "hours"
	| "connections"
	| "days"
	| "rank"
	| "early";

export interface StickerView {
	key: string;
	name: string;
	description: string;
	icon: StickerIconKey;
	tier: StickerTier;
	earned: boolean;
	available: boolean;
	current: number;
	target: number;
	earnedAt: string | Date | null;
	unit: StickerUnit;
}

const TIER_STYLES: Record<
	StickerTier,
	{ outer: string; inner: string; ink: string }
> = {
	bronze: {
		outer: "#a56a34",
		inner: "#d9a166",
		ink: "#4a2a12",
	},
	silver: {
		outer: "#7b8796",
		inner: "#c3ccd6",
		ink: "#2f3742",
	},
	gold: {
		outer: "#b8860b",
		inner: "#f0c94d",
		ink: "#4a3800",
	},
};

export function stickerProgressLabel(
	sticker: StickerView,
	timeZone: string,
): string {
	if (!sticker.available) return "Indisponível";
	if (sticker.earned) {
		if (sticker.earnedAt) {
			return formatInstant(sticker.earnedAt, timeZone, {
				day: "2-digit",
				month: "short",
			});
		}
		return "Conquistado";
	}

	switch (sticker.unit) {
		case "hours":
			return `${sticker.current}h de ${sticker.target}h`;
		case "sessions":
			return `${sticker.current}/${sticker.target} sessões`;
		case "connections":
			return `${sticker.current}/${sticker.target} conexões`;
		case "days":
			return `${sticker.current}/${sticker.target} dias`;
		case "rank":
			return "Top 10";
		case "early":
			return "Sessão antes das 9h";
		case "checkin":
			return "Primeiro check-in";
	}
}

/**
 * Selo de adesivo gerado em SVG — sem imagens, uploads ou dependência de
 * tema externo. O anel usa as cores do tier; o miolo usa o fundo atual.
 */
export function StickerSeal({
	sticker,
	className,
}: {
	sticker: StickerView;
	className?: string;
}) {
	const timeZone = useEventTimeZone();
	if (!sticker.available) return null;

	const tier = TIER_STYLES[sticker.tier];
	const label = stickerProgressLabel(sticker, timeZone);

	return (
		<figure
			className={cn(
				"flex w-24 shrink-0 flex-col items-center gap-1.5",
				className,
			)}
			aria-label={`Adesivo ${sticker.name}: ${sticker.earned ? "conquistado" : `bloqueado, ${label}`}`}
		>
			<div
				className={cn(
					"relative size-20",
					!sticker.earned && "opacity-45 grayscale",
				)}
			>
				<svg
					viewBox="0 0 100 100"
					className="size-full drop-shadow-sm"
					aria-hidden
				>
					{Array.from({ length: 12 }, (_, index) => {
						const angle = (index / 12) * Math.PI * 2;
						return (
							<circle
								key={index}
								cx={50 + 38 * Math.cos(angle)}
								cy={50 + 38 * Math.sin(angle)}
								r={10}
								fill={tier.outer}
							/>
						);
					})}
					<circle cx={50} cy={50} r={39} fill={tier.outer} />
					<circle cx={50} cy={50} r={32} fill={tier.inner} />
					<circle cx={50} cy={50} r={24} fill="#f8f5ef" />
				</svg>
				<div className="absolute inset-0 flex items-center justify-center">
					<StickerIcon
						icon={sticker.icon}
						className="size-7"
						style={{ color: tier.ink }}
					/>
				</div>
				{!sticker.earned && (
					<span className="bg-background text-foreground absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full shadow-sm">
						<Lock className="size-3" aria-hidden />
					</span>
				)}
			</div>
			<figcaption className="flex flex-col items-center text-center">
				<span className="text-foreground text-xs leading-tight font-semibold">
					{sticker.name}
				</span>
				<span className="text-muted-foreground text-[10px] leading-tight">
					{label}
				</span>
			</figcaption>
		</figure>
	);
}
