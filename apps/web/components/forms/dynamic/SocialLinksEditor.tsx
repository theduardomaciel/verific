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
} from "@verific/drizzle/profile-layout";
import { Link2Icon } from "lucide-react";

export type SocialEntry = { service: string; value: string };

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

	return (
		<div className="flex flex-col gap-3">
			{value.map((entry, i) => {
				const service =
					socialServiceById(entry.service) ?? services[0]!;
				return (
					<div key={i} className="flex items-end gap-2">
						{/* <div className="w-36 shrink-0"> */}
						<Select
							disabled={disabled}
							value={service.id}
							onValueChange={(s) => setEntry(i, { service: s })}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{services.map((s) => (
									<SelectItem key={s.id} value={s.id}>
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
					disabled={disabled}
					onClick={() =>
						onChange([
							...value,
							{ service: services[0]!.id, value: "" },
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
