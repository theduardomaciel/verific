import {
	BookOpen,
	Briefcase,
	Cake,
	Calendar,
	Flag,
	Globe,
	GraduationCap,
	Heart,
	MapPin,
	Music,
	Phone,
	Star,
} from "lucide-react";

import type { StatIconKey } from "@verific/drizzle/profile-layout";

const STAT_ICONS: Record<StatIconKey, typeof Cake> = {
	cake: Cake,
	"map-pin": MapPin,
	"graduation-cap": GraduationCap,
	briefcase: Briefcase,
	phone: Phone,
	globe: Globe,
	calendar: Calendar,
	star: Star,
	heart: Heart,
	flag: Flag,
	music: Music,
	"book-open": BookOpen,
};

export function StatIcon({ icon, size = 24 }: { icon: StatIconKey; size?: number }) {
	const Icon = STAT_ICONS[icon] ?? Star;
	return <Icon size={size} />;
}
