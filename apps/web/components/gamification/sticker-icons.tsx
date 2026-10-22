import {
	BadgeCheck,
	CalendarCheck,
	CalendarDays,
	Compass,
	Flag,
	Sunrise,
	Timer,
	Trophy,
	Users,
	type LucideIcon,
} from "lucide-react";

import type { StickerIconKey } from "@verific/drizzle/gamification";

const STICKER_ICONS: Record<StickerIconKey, LucideIcon> = {
	"badge-check": BadgeCheck,
	compass: Compass,
	timer: Timer,
	users: Users,
	sunrise: Sunrise,
	trophy: Trophy,
	"calendar-check": CalendarCheck,
	"calendar-days": CalendarDays,
	flag: Flag,
};

export function StickerIcon({
	icon,
	className,
	style,
}: {
	icon: StickerIconKey;
	className?: string;
	style?: React.CSSProperties;
}) {
	const Icon = STICKER_ICONS[icon] ?? BadgeCheck;
	return <Icon className={className} style={style} aria-hidden />;
}
