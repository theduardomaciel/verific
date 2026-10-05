"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ColorPicker } from "@/components/pickers/color-picker";
import type {
	EffectColor,
	EventTheme,
	FontPreset,
	GradientStop,
	ThemeRole,
} from "@verific/drizzle/theme";

interface ContrastInfo {
	primary: { fg: string; ratio: number };
	secondary: { fg: string; ratio: number };
}

interface ThemeControlsProps {
	draft: EventTheme;
	patch: (p: Partial<EventTheme>) => void;
	contrast: ContrastInfo;
}

function RatioBadge({ ratio }: { ratio: number }) {
	const ok = ratio >= 4.5;
	return (
		<Badge variant={ok ? "secondary" : "destructive"}>
			{ratio.toFixed(2)} {ok ? "AA" : "baixo"}
		</Badge>
	);
}

function ColorRow({
	label,
	value,
	onChange,
	ratio,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	ratio?: number;
}) {
	return (
		<div className="flex items-center justify-between gap-2">
			<div className="flex items-center gap-2">
				<Label>{label}</Label>
				{ratio !== undefined && <RatioBadge ratio={ratio} />}
			</div>
			<div className="flex items-center gap-2">
				<span className="text-muted-foreground font-mono text-xs uppercase">
					{value}
				</span>
				<ColorPicker color={value} onChange={(c) => c && onChange(c)} />
			</div>
		</div>
	);
}

function RoleRow<T extends string>({
	label,
	value,
	onChange,
	options,
}: {
	label: string;
	value: T;
	onChange: (v: T) => void;
	options: Array<{ value: T; label: string }>;
}) {
	return (
		<div className="flex items-center justify-between gap-2">
			<Label>{label}</Label>
			<Select value={value} onValueChange={(v) => onChange(v as T)}>
				<SelectTrigger className="w-36">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{options.map((opt) => (
						<SelectItem key={opt.value} value={opt.value}>
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

const ROLE_OPTIONS: Array<{ value: ThemeRole; label: string }> = [
	{ value: "primary", label: "Primária" },
	{ value: "secondary", label: "Secundária" },
];

const GRADIENT_STOP_OPTIONS: Array<{ value: GradientStop; label: string }> = [
	{ value: "primary", label: "Primária" },
	{ value: "secondary", label: "Secundária" },
	{ value: "transparent", label: "Transparente" },
];

const EFFECT_COLOR_OPTIONS: Array<{ value: EffectColor; label: string }> = [
	{ value: "primary", label: "Primária" },
	{ value: "secondary", label: "Secundária" },
	{ value: "foreground", label: "Texto (neutro)" },
];

function RangeRow({
	label,
	value,
	min,
	max,
	step,
	onChange,
	format,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (v: number) => void;
	format?: (v: number) => string;
}) {
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between gap-2">
				<Label>{label}</Label>
				<span className="text-muted-foreground font-mono text-xs">
					{format ? format(value) : value}
				</span>
			</div>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className="accent-primary w-full"
			/>
		</div>
	);
}

const FONT_LABELS: Record<FontPreset, string> = {
	"hanken-grotesk": "Hanken Grotesk",
	rem: "REM",
	inter: "Inter",
	sora: "Sora",
	"space-grotesk": "Space Grotesk",
};

function FontRow({
	label,
	value,
	onChange,
}: {
	label: string;
	value: FontPreset;
	onChange: (v: FontPreset) => void;
}) {
	return (
		<div className="flex items-center justify-between gap-2">
			<Label>{label}</Label>
			<Select value={value} onValueChange={(v) => onChange(v as FontPreset)}>
				<SelectTrigger className="w-44">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{(Object.keys(FONT_LABELS) as FontPreset[]).map((preset) => (
						<SelectItem key={preset} value={preset}>
							{FONT_LABELS[preset]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

export function ThemeControls({ draft, patch, contrast }: ThemeControlsProps) {
	return (
		<Accordion type="multiple" defaultValue={["cores"]} className="w-full">
			<AccordionItem value="cores">
				<AccordionTrigger>Cores base</AccordionTrigger>
				<AccordionContent className="flex flex-col gap-4">
					<ColorRow
						label="Primária"
						value={draft.primary}
						onChange={(primary) => patch({ primary })}
						ratio={contrast.primary.ratio}
					/>
					<ColorRow
						label="Secundária"
						value={draft.secondary}
						onChange={(secondary) => patch({ secondary })}
						ratio={contrast.secondary.ratio}
					/>
					<p className="text-muted-foreground text-xs">
						O texto sobre cada cor é derivado automaticamente com alvo
						AA.
					</p>
				</AccordionContent>
			</AccordionItem>

			<AccordionItem value="fontes">
				<AccordionTrigger>Fontes</AccordionTrigger>
				<AccordionContent className="flex flex-col gap-4">
					<FontRow
						label="Títulos"
						value={draft.fonts.heading}
						onChange={(heading) =>
							patch({ fonts: { ...draft.fonts, heading } })
						}
					/>
					<FontRow
						label="Texto"
						value={draft.fonts.body}
						onChange={(body) => patch({ fonts: { ...draft.fonts, body } })}
					/>
				</AccordionContent>
			</AccordionItem>

			<AccordionItem value="cabecalho">
				<AccordionTrigger>Cabeçalho</AccordionTrigger>
				<AccordionContent className="flex flex-col gap-4">
					<RoleRow
						label="Fundo"
						value={draft.header.bg}
						options={ROLE_OPTIONS}
						onChange={(bg) => patch({ header: { ...draft.header, bg } })}
					/>
					<div className="flex items-center justify-between gap-2">
						<Label>Estilo</Label>
						<Select
							value={draft.header.style}
							onValueChange={(v) =>
								patch({
									header: {
										...draft.header,
										style: v as EventTheme["header"]["style"],
									},
								})
							}
						>
							<SelectTrigger className="w-36">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="solid">Sólido</SelectItem>
								<SelectItem value="gradient">Gradiente</SelectItem>
								<SelectItem value="transparent">Transparente</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</AccordionContent>
			</AccordionItem>

			<AccordionItem value="elementos">
				<AccordionTrigger>Rodapé, botões e conteúdo</AccordionTrigger>
				<AccordionContent className="flex flex-col gap-4">
					<RoleRow
						label="Fundo do rodapé"
						value={draft.footer.bg}
						options={ROLE_OPTIONS}
						onChange={(bg) => patch({ footer: { bg } })}
					/>
					<RoleRow
						label="Fundo dos botões"
						value={draft.buttons.bg}
						options={ROLE_OPTIONS}
						onChange={(bg) => patch({ buttons: { bg } })}
					/>
					<RoleRow
						label="Destaque do conteúdo"
						value={draft.content.accent}
						options={ROLE_OPTIONS}
						onChange={(accent) => patch({ content: { accent } })}
					/>
				</AccordionContent>
			</AccordionItem>

			<AccordionItem value="hero">
				<AccordionTrigger>Capa (hero)</AccordionTrigger>
				<AccordionContent className="flex flex-col gap-4">
					<RangeRow
						label="Opacidade da cor sobre a capa"
						value={draft.hero.overlayOpacity}
						min={0}
						max={0.85}
						step={0.05}
						onChange={(overlayOpacity) =>
							patch({ hero: { overlayOpacity } })
						}
						format={(v) => `${Math.round(v * 100)}%`}
					/>
				</AccordionContent>
			</AccordionItem>

			<AccordionItem value="fundo">
				<AccordionTrigger>Fundo da página</AccordionTrigger>
				<AccordionContent className="flex flex-col gap-4">
					<div className="flex items-center justify-between gap-2">
						<Label>Efeito</Label>
						<Select
							value={draft.page.effect}
							onValueChange={(v) =>
								patch({
									page: {
										...draft.page,
										effect: v as EventTheme["page"]["effect"],
									},
								})
							}
						>
							<SelectTrigger className="w-36">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">Nenhum</SelectItem>
								<SelectItem value="grid">Grade</SelectItem>
								<SelectItem value="dots">Pontos</SelectItem>
								<SelectItem value="solid">Cor sólida</SelectItem>
							</SelectContent>
						</Select>
					</div>
					{draft.page.effect !== "none" && (
						<>
							<RoleRow
								label="Cor do efeito"
								value={draft.page.effectColor}
								options={EFFECT_COLOR_OPTIONS}
								onChange={(effectColor) =>
									patch({ page: { ...draft.page, effectColor } })
								}
							/>
							<RangeRow
								label="Tamanho"
								value={draft.page.effectSize}
								min={8}
								max={96}
								step={4}
								onChange={(effectSize) =>
									patch({ page: { ...draft.page, effectSize } })
								}
								format={(v) => `${v}px`}
							/>
							<RangeRow
								label="Opacidade"
								value={draft.page.effectOpacity}
								min={0}
								max={0.5}
								step={0.02}
								onChange={(effectOpacity) =>
									patch({ page: { ...draft.page, effectOpacity } })
								}
								format={(v) => `${Math.round(v * 100)}%`}
							/>
						</>
					)}
					<GradientRow
						label="Gradiente superior"
						value={draft.page.topGradient}
						onChange={(topGradient) =>
							patch({ page: { ...draft.page, topGradient } })
						}
					/>
					<GradientRow
						label="Gradiente inferior"
						value={draft.page.bottomGradient}
						onChange={(bottomGradient) =>
							patch({ page: { ...draft.page, bottomGradient } })
						}
					/>
				</AccordionContent>
			</AccordionItem>

			<AccordionItem value="cartoes">
				<AccordionTrigger>Cartões</AccordionTrigger>
				<AccordionContent className="flex flex-col gap-4">
					<div className="flex items-center justify-between gap-2">
						<Label>Arredondamento</Label>
						<Select
							value={String(draft.card.radius)}
							onValueChange={(v) =>
								patch({
									card: { radius: Number(v) as 16 | 20 | 24 },
								})
							}
						>
							<SelectTrigger className="w-36">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="16">16px</SelectItem>
								<SelectItem value="20">20px</SelectItem>
								<SelectItem value="24">24px</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}

function GradientRow({
	label,
	value,
	onChange,
}: {
	label: string;
	value: EventTheme["page"]["topGradient"];
	onChange: (
		v: EventTheme["page"]["topGradient"],
	) => void;
}) {
	const enabled = value !== null;
	const g = value ?? { height: 240, from: "primary" as const, to: "secondary" as const, opacity: 0.35 };
	return (
		<div className="flex flex-col gap-3 rounded-lg border p-3">
			<div className="flex items-center justify-between gap-2">
				<Label>{label}</Label>
				<Switch
					checked={enabled}
					onCheckedChange={(checked) =>
						onChange(checked ? { ...g } : null)
					}
				/>
			</div>
			{enabled && (
				<>
					<RangeRow
						label="Altura"
						value={g.height}
						min={0}
						max={600}
						step={20}
						onChange={(height) => onChange({ ...g, height })}
						format={(v) => `${v}px`}
					/>
					<RangeRow
						label="Opacidade"
						value={g.opacity}
						min={0}
						max={1}
						step={0.05}
						onChange={(opacity) => onChange({ ...g, opacity })}
						format={(v) => `${Math.round(v * 100)}%`}
					/>
					<RoleRow
						label="De"
						value={g.from}
						options={GRADIENT_STOP_OPTIONS}
						onChange={(from) => onChange({ ...g, from })}
					/>
					<RoleRow
						label="Para"
						value={g.to}
						options={GRADIENT_STOP_OPTIONS}
						onChange={(to) => onChange({ ...g, to })}
					/>
				</>
			)}
		</div>
	);
}
