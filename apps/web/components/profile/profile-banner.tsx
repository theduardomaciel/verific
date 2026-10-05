import { MailIcon } from "lucide-react";

import { getInitials } from "@/lib/i18n";
import { SocialServiceIcon } from "./social-icons";
import { cn } from "@/lib/utils";

export interface BannerSocial {
	service: string;
	url: string;
	display: string;
}

interface ProfileBannerProps {
	name: string;
	avatarUrl: string | null;
	subtitle: string;
	bio: string | null;
	socials: BannerSocial[];
	publicEmail: string | null;
	showBioAndSocials: boolean;
	actions?: React.ReactNode;
}

/**
 * Banner do perfil (server, só dados públicos): gradiente
 * secondary→primary com fade para o fundo, avatar, nome, bio e chips.
 */
export function ProfileBanner({
	name,
	avatarUrl,
	subtitle,
	bio,
	socials,
	publicEmail,
	showBioAndSocials,
	actions,
}: ProfileBannerProps) {
	return (
		<header
			className={cn(
				"relative flex w-full flex-col items-start justify-start gap-4 overflow-hidden rounded-3xl p-8",
				[showBioAndSocials && bio && "md:h-96"],
			)}
		>
			<div
				aria-hidden
				className="absolute inset-0 opacity-45"
				style={{
					background:
						"linear-gradient(135deg, var(--secondary) 0%, var(--primary) 65%)",
					maskImage:
						"linear-gradient(180deg, black 55%, transparent 100%)",
					WebkitMaskImage:
						"linear-gradient(180deg, black 55%, transparent 100%)",
				}}
			/>
			<div className="relative z-10 flex w-full flex-col items-start gap-4">
				{avatarUrl ? (
					<img
						src={avatarUrl}
						alt={`Foto de ${name}`}
						width={110}
						height={110}
						className="h-24 w-24 rounded-full object-cover md:h-28 md:w-28"
					/>
				) : (
					<span
						aria-label={`Foto de ${name}`}
						className="bg-background text-foreground flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold md:h-28 md:w-28"
					>
						{getInitials(name)}
					</span>
				)}
				<div className="flex flex-col items-start justify-start gap-2">
					<h1 className="font-heading text-3xl font-bold text-foreground">
						{name}
					</h1>
					{subtitle && (
						<h2 className="text-lg font-normal text-muted-foreground">
							{subtitle}
						</h2>
					)}
				</div>
				{showBioAndSocials && bio && (
					<p className="text-foreground/90 md:max-w-3/4">{bio}</p>
				)}
				{showBioAndSocials && (socials.length > 0 || publicEmail) && (
					<ul className="flex flex-row flex-wrap items-start justify-start gap-4">
						{socials.map((social) => (
							<li key={`${social.service}-${social.url}`}>
								<a
									className="flex flex-row items-center justify-start gap-2 rounded-md bg-black/30 px-2 py-1.5 text-sm leading-none font-medium text-white/90"
									href={social.url}
									target="_blank"
									rel="noopener noreferrer"
								>
									<SocialServiceIcon
										service={social.service}
									/>
									<span>{social.display}</span>
								</a>
							</li>
						))}
						{publicEmail && (
							<li key={publicEmail}>
								<a
									className="flex flex-row items-center justify-start gap-2 rounded-md bg-black/30 px-2 py-1.5 text-sm leading-none font-medium text-white/90"
									href={`mailto:${publicEmail}`}
								>
									<MailIcon width={16} height={16} />
									<span>{publicEmail}</span>
								</a>
							</li>
						)}
					</ul>
				)}
			</div>
			{actions}
		</header>
	);
}
