"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	SOCIAL_SERVICES,
	socialServiceById,
	type SocialServiceIcon,
} from "@verific/drizzle/profile-layout";
import { Globe, type LucideIcon, Link2Icon } from "lucide-react";

import Github from "@/public/icons/github.svg";
import Instagram from "@/public/icons/instagram.svg";
import Linkedin from "@/public/icons/linkedin.svg";
import Twitter from "@/public/icons/twitter.svg";
import Lattes from "@/public/icons/lattes.svg";

export type SocialEntry = { service: string; value: string };

const SOCIAL_ICONS: Record<SocialServiceIcon, LucideIcon> = {
	github: Github,
	instagram: Instagram,
	linkedin: Linkedin,
	x: Twitter,
	globe: Globe,
	lattes: Lattes,
};

function SocialServiceIcon({ icon }: { icon: SocialServiceIcon }) {
	const Icon = SOCIAL_ICONS[icon] ?? Globe;
	return <Icon className="size-4 shrink-0" aria-hidden />;
}

interface SocialLinksEditorProps {
	services: Array<(typeof SOCIAL_SERVICES)[number]>;
	value: SocialEntry[];
	disabled?: boolean;
	onChange: (next: SocialEntry[]) => void;
}

/**
 * Editor incremental de links sociais: começa vazio, adiciona serviço +
 * valor sob demanda, remove por entrada. Sem inputs pré-renderizados.
 */
export function SocialLinksEditor({
	services,
	value,
	disabled,
	onChange,
}: SocialLinksEditorProps) {
	function setEntry(index: number, patch: Partial<SocialEntry>) {
		onChange(value.map((e, i) => (i === index ? { ...e, ...patch } : e)));
	}

	const firstUnused = services.find(
		(s) => !value.some((e) => e.service === s.id),
	);

	return (
		<div className="flex flex-col gap-3">
			{value.map((entry, i) => {
				const service =
					socialServiceById(entry.service) ?? services[0]!;
				const takenByOthers = new Set(
					value.flatMap((e, j) => (j === i ? [] : [e.service])),
				);
				const options = services.filter(
					(s) => s.id === service.id || !takenByOthers.has(s.id),
				);
				// Key by service, not just index: Radix Select keeps
				// internal display state per instance, so reusing the
				// instance of a removed row for a different service can
				// leave the trigger showing the wrong service. A key
				// change remounts the row with fresh state instead.
				return (
					<div
						key={`${service.id}-${i}`}
						className="flex items-end gap-2"
					>
						{/* <div className="w-36 shrink-0"> */}
						<Select
							disabled={disabled}
							value={service.id}
							onValueChange={(s) => setEntry(i, { service: s })}
						>
							<SelectTrigger className="min-w-36">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{options.map((s) => (
									<SelectItem key={s.id} value={s.id}>
										<SocialServiceIcon icon={s.icon} />
										{s.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{/* </div> */}
						<Input
							type="text"
							placeholder="usuário ou URL"
							disabled={disabled}
							value={entry.value}
							onChange={(e) =>
								setEntry(i, { value: e.target.value })
							}
						/>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={disabled}
							onClick={() =>
								onChange(value.filter((_, j) => j !== i))
							}
							aria-label="Remover link"
						>
							✕
						</Button>
					</div>
				);
			})}
			<div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={disabled || !firstUnused}
					className="min-w-36"
					onClick={() =>
						firstUnused &&
						onChange([
							...value,
							{ service: firstUnused.id, value: "" },
						])
					}
				>
					<Link2Icon />
					Adicionar link
				</Button>
			</div>
		</div>
	);
}
