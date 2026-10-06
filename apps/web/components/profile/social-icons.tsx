"use client";

import { Globe } from "lucide-react";

import GithubIcon from "@/public/icons/github.svg";
import InstagramIcon from "@/public/icons/instagram.svg";
import LinkedinIcon from "@/public/icons/linkedin.svg";
import TwitterIcon from "@/public/icons/twitter.svg";

/**
 * Marca por serviço de rede social. Lattes usa globo como placeholder
 * até o SVG da marca chegar (TODO(lattes)).
 */
const SOCIAL_ICONS: Record<
	string,
	React.ComponentType<{ width?: number | string; height?: number | string }>
> = {
	github: GithubIcon,
	instagram: InstagramIcon,
	linkedin: LinkedinIcon,
	x: TwitterIcon,
	website: Globe,
	lattes: Globe,
};

export function SocialServiceIcon({
	service,
	size = 16,
}: {
	service: string;
	size?: number;
}) {
	const Icon = SOCIAL_ICONS[service] ?? Globe;
	return <Icon width={size} height={size} />;
}
