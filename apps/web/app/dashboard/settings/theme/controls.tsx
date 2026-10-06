"use client";

import { RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import {
	DEFAULT_THEME,
	type EffectColor,
	type EventTheme,
	type FontPreset,
	type HeroOverlayColor,
	type PageGradient,
	type SkeletonBg,
	type ThemeColorSource,
	type ThemeRole,
} from "@verific/drizzle/theme";
import { darkenUntilContrast, HERO_NEUTRAL_TINT } from "@/lib/theme/resolve";
import { useEffect, useRef } from "react";

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

function ChangedBadge({ changed }: { changed: boolean }) {
	if (!changed) return null;
	return (
		<Badge variant="outline" className="ml-2 text-[10px] font-normal">
			alterado
		</Badge>
	);
}

function SectionReset({
	visible,
	onReset,
	label = "Restaurar padrão",
}: {
	visible: boolean;
	onReset: () => void;
	label?: string;
}) {
	if (!visible) return null;
	return (
		<div className="flex justify-end">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="h-7 px-2 text-xs"
				onClick={onReset}
			>
				<RotateCcw className="mr-1.5 h-3.5 w-3.5" />
				{label}
			</Button>
		</div>
	);
}

function SwatchDot({
	color,
	transparent,
}: {
	color?: string;
	transparent?: boolean;
}) {
	if (transparent) {
		return (
			<span
				aria-hidden
				className="size-4 shrink-0 rounded-full border border-dashed"
				style={{
					backgroundImage:
						"linear-gradient(45deg, var(--muted-foreground) 25%, transparent 25%, transparent 75%, var(--muted-foreground) 75%)",
					backgroundSize: "4px 4px",
				}}
			/>
		);
	}
	return (
		<span
			aria-hidden
			className="size-4 shrink-0 rounded-full border border-black/20"
			style={{ backgroundColor: color ?? "transparent" }}
		/>
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
		<div className="flex flex-wrap items-center justify-between gap-2">
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
	swatches,
}: {
	label: string;
	value: T;
	onChange: (v: T) => void;
	options: Array<{ value: T; label: string }>;
	swatches?: Partial<Record<T, string | null>>;
}) {
	const groupRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		groupRef.current
			?.querySelector<HTMLElement>('[aria-pressed="true"]')
			?.scrollIntoView({
				behavior: "smooth",
				inline: "center",
				block: "nearest",
			});
	}, [value]);

	return (
		<div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
			<Label>{label}</Label>
			<div
				ref={groupRef}
				// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- grupo rotulado de botões toggle (nenhuma tag nativa adequada; radiogroup seria incorreto).
				role="group"
				aria-label={label}
				className="flex max-w-full [scrollbar-width:none] gap-1 overflow-x-auto rounded-lg border p-1 [&::-webkit-scrollbar]:hidden"
			>
				{options.map((opt) => {
					const active = opt.value === value;
					const sw =
						swatches && opt.value in swatches
							? swatches[opt.value]
							: undefined;
					return (
						<button
							key={opt.value}
							type="button"
							aria-pressed={active}
							title={opt.label}
							onClick={() => onChange(opt.value)}
							className={cn(
								"flex min-h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
								active
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:bg-muted",
							)}
						>
							{sw !== undefined && (
								<SwatchDot
									color={sw ?? undefined}
									transparent={sw === null}
								/>
							)}
							{opt.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}

const ROLE_OPTIONS: Array<{ value: ThemeRole; label: string }> = [
	{ value: "primary", label: "Primária" },
	{ value: "secondary", label: "Secundária" },
];

/**
 * Origens de cor (papéis do tema, nunca hex): primária, secundária, neutra
 * (`foreground`, resolve por modo) e fundo da página (`background`, também
 * por modo — o que permite o mesmo gradiente no claro e no escuro).
 */
const SOURCE_OPTIONS: Array<{ value: ThemeColorSource; label: string }> = [
	{ value: "primary", label: "Primária" },
	{ value: "secondary", label: "Secundária" },
	{ value: "foreground", label: "Neutra" },
	{ value: "background", label: "Fundo" },
];

/** Destaque do conteúdo e cor do filete: papéis sem o fundo da página. */
const ACCENT_OPTIONS: Array<{ value: EffectColor; label: string }> = [
	{ value: "primary", label: "Primária" },
	{ value: "secondary", label: "Secundária" },
	{ value: "foreground", label: "Neutra" },
];

const EFFECT_COLOR_OPTIONS: Array<{ value: EffectColor; label: string }> = [
	{ value: "primary", label: "Primária" },
	{ value: "secondary", label: "Secundária" },
	{ value: "foreground", label: "Texto (neutro)" },
];
const SKELETON_OPTIONS: Array<{ value: SkeletonBg; label: string }> = [
	{ value: "muted", label: "Neutra" },
	{ value: "primary", label: "Primária" },
	{ value: "secondary", label: "Secundária" },
];

const HERO_OVERLAY_OPTIONS: Array<{
	value: HeroOverlayColor;
	label: string;
}> = [
	{ value: "primary", label: "Primária" },
	{ value: "secondary", label: "Secundária" },
	{ value: "dark", label: "Escura" },
];

/**
 * Controle reutilizável de origem de cor: botões de amostra (Primária /
 * Secundária / Neutra / Fundo) mais um slider opcional de opacidade. Usado
 * nas paradas dos gradientes, na cor do filete da capa e no destaque do
 * conteúdo — nunca seletores hex aqui, só papéis do tema.
 */
function ColorSourceRow<T extends string>({
	label,
	value,
	onChange,
	options,
	swatches,
	opacity,
	opacityLabel,
	onOpacityChange,
}: {
	label: string;
	value: T;
	onChange: (v: T) => void;
	options: Array<{ value: T; label: string }>;
	swatches?: Partial<Record<T, string | null>>;
	opacity?: number;
	opacityLabel?: string;
	onOpacityChange?: (v: number) => void;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<RoleRow
				label={label}
				value={value}
				options={options}
				swatches={swatches}
				onChange={onChange}
			/>
			{opacity !== undefined && onOpacityChange && (
				<RangeRow
					label={opacityLabel ?? "Opacidade"}
					value={opacity}
					min={0}
					max={1}
					step={0.05}
					onChange={onOpacityChange}
					format={(v) => `${Math.round(v * 100)}%`}
				/>
			)}
		</div>
	);
}

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
				aria-label={label}
				onChange={(e) => onChange(Number(e.target.value))}
				className="accent-primary min-h-8 w-full cursor-pointer py-2 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5"
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
			<Select
				value={value}
				onValueChange={(v) => onChange(v as FontPreset)}
			>
				<SelectTrigger className="w-44">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{(Object.keys(FONT_LABELS) as FontPreset[]).map(
						(preset) => (
							<SelectItem key={preset} value={preset}>
								{FONT_LABELS[preset]}
							</SelectItem>
						),
					)}
				</SelectContent>
			</Select>
		</div>
	);
}

interface ThemePreset {
	name: string;
	primary: string;
	secondary: string;
	fonts: EventTheme["fonts"];
	header: EventTheme["header"];
}

const THEME_PRESETS: ThemePreset[] = [
	{
		name: "Padrão",
		primary: "#6D28D9",
		secondary: "#14B8A6",
		fonts: { heading: "rem", body: "hanken-grotesk" },
		header: { bg: "primary", style: "solid" },
	},
	{
		name: "Oceano",
		primary: "#1D4ED8",
		secondary: "#06B6D4",
		fonts: { heading: "sora", body: "inter" },
		header: { bg: "primary", style: "solid" },
	},
	{
		name: "Pôr do sol",
		primary: "#EA580C",
		secondary: "#DB2777",
		fonts: { heading: "sora", body: "hanken-grotesk" },
		header: { bg: "primary", style: "gradient" },
	},
	{
		name: "Floresta",
		primary: "#166534",
		secondary: "#84CC16",
		fonts: { heading: "space-grotesk", body: "inter" },
		header: { bg: "primary", style: "solid" },
	},
	{
		name: "Vinho",
		primary: "#881337",
		secondary: "#F59E0B",
		fonts: { heading: "rem", body: "inter" },
		header: { bg: "primary", style: "solid" },
	},
	{
		name: "Meia-noite",
		primary: "#1E1B4B",
		secondary: "#818CF8",
		fonts: { heading: "space-grotesk", body: "hanken-grotesk" },
		header: { bg: "primary", style: "gradient" },
	},
	{
		name: "Tropical",
		primary: "#0F766E",
		secondary: "#F97316",
		fonts: { heading: "rem", body: "hanken-grotesk" },
		header: { bg: "secondary", style: "solid" },
	},
	{
		name: "Uva",
		primary: "#7E22CE",
		secondary: "#F0ABFC",
		fonts: { heading: "sora", body: "inter" },
		header: { bg: "primary", style: "solid" },
	},
];

function PresetGrid({
	draft,
	patch,
}: {
	draft: EventTheme;
	patch: (p: Partial<EventTheme>) => void;
}) {
	return (
		<div>
			<Label className="mb-2 block">Modelos prontos</Label>
			<div className="grid grid-cols-4 gap-2">
				{THEME_PRESETS.map((preset) => {
					const active =
						draft.primary.toLowerCase() ===
							preset.primary.toLowerCase() &&
						draft.secondary.toLowerCase() ===
							preset.secondary.toLowerCase();
					return (
						<button
							key={preset.name}
							type="button"
							title={preset.name}
							aria-pressed={active}
							aria-label={`Aplicar modelo ${preset.name}`}
							onClick={() =>
								patch({
									primary: preset.primary,
									secondary: preset.secondary,
									fonts: { ...preset.fonts },
									header: { ...preset.header },
								})
							}
							className={cn(
								"flex min-h-11 flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors",
								active
									? "border-primary ring-primary/30 ring-2"
									: "hover:border-muted-foreground/40",
							)}
						>
							<span className="flex overflow-hidden rounded-full border">
								<span
									aria-hidden
									className="h-4 w-4"
									style={{ backgroundColor: preset.primary }}
								/>
								<span
									aria-hidden
									className="h-4 w-4"
									style={{
										backgroundColor: preset.secondary,
									}}
								/>
							</span>
							<span className="text-muted-foreground max-w-full truncate text-[10px] leading-tight">
								{preset.name}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function ThemeControls({ draft, patch, contrast }: ThemeControlsProps) {
	const roleSwatches = {
		primary: draft.primary,
		secondary: draft.secondary,
	} as const;
	const gradientSwatches = {
		primary: draft.primary,
		secondary: draft.secondary,
		foreground: "var(--foreground)",
		background: "var(--background)",
	} as const;
	const effectSwatches = {
		primary: draft.primary,
		secondary: draft.secondary,
		foreground: "var(--foreground)",
	} as const;
	// A amostra mostra o tom realmente aplicado sobre a capa (a cor
	// escolhida já escurecida até atingir AA contra o texto branco), e não
	// a cor crua — é o que o visitante vai ver.
	const heroSwatches = {
		primary: darkenUntilContrast(draft.primary),
		secondary: darkenUntilContrast(draft.secondary),
		dark: darkenUntilContrast(HERO_NEUTRAL_TINT),
	} as const;

	const changed = {
		cores: !eq(
			{ primary: draft.primary, secondary: draft.secondary },
			{
				primary: DEFAULT_THEME.primary,
				secondary: DEFAULT_THEME.secondary,
			},
		),
		fontes: !eq(draft.fonts, DEFAULT_THEME.fonts),
		cabecalho: !eq(draft.header, DEFAULT_THEME.header),
		elementos: !eq(
			{
				footer: draft.footer,
				buttons: draft.buttons,
				content: draft.content,
			},
			{
				footer: DEFAULT_THEME.footer,
				buttons: DEFAULT_THEME.buttons,
				content: DEFAULT_THEME.content,
			},
		),
		hero: !eq(draft.hero, DEFAULT_THEME.hero),
		fundo: !eq(draft.page, DEFAULT_THEME.page),
		cartoes: !eq(draft.card, DEFAULT_THEME.card),
	};

	return (
		<Accordion
			type="multiple"
			defaultValue={["cores", "fontes"]}
			className="w-full"
		>
			<AccordionItem value="cores">
				<AccordionTrigger>
					<span>
						Cores base
						<ChangedBadge changed={changed.cores} />
					</span>
				</AccordionTrigger>
				<AccordionContent className="flex flex-col gap-4">
					<PresetGrid draft={draft} patch={patch} />
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
						O texto sobre cada cor é derivado automaticamente com
						alvo AA.
					</p>
					<SectionReset
						visible={changed.cores}
						onReset={() =>
							patch({
								primary: DEFAULT_THEME.primary,
								secondary: DEFAULT_THEME.secondary,
							})
						}
					/>
				</AccordionContent>
			</AccordionItem>

			<AccordionItem value="fontes">
				<AccordionTrigger>
					<span>
						Fontes
						<ChangedBadge changed={changed.fontes} />
					</span>
				</AccordionTrigger>
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
						onChange={(body) =>
							patch({ fonts: { ...draft.fonts, body } })
						}
					/>
					<SectionReset
						visible={changed.fontes}
						onReset={() => patch({ fonts: DEFAULT_THEME.fonts })}
					/>
				</AccordionContent>
			</AccordionItem>

			<AccordionItem value="cabecalho">
				<AccordionTrigger>
					<span>
						Cabeçalho
						<ChangedBadge changed={changed.cabecalho} />
					</span>
				</AccordionTrigger>
				<AccordionContent className="flex flex-col gap-4">
					<RoleRow
						label="Fundo"
						value={draft.header.bg}
						options={ROLE_OPTIONS}
						swatches={roleSwatches}
						onChange={(bg) =>
							patch({ header: { ...draft.header, bg } })
						}
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
								<SelectItem value="gradient">
									Gradiente
								</SelectItem>
								<SelectItem value="transparent">
									Transparente
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					{draft.header.style === "transparent" && (
						<p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
							Cabeçalho transparente: ele fica no fluxo, sobre o
							fundo da página (não sobre a capa), então o texto
							segue a preferência de cor do visitante — claro no
							modo claro. O menu mobile usa o fundo da página para
							continuar legível. Confira na prévia.
						</p>
					)}
					<SectionReset
						visible={changed.cabecalho}
						onReset={() => patch({ header: DEFAULT_THEME.header })}
					/>
				</AccordionContent>
			</AccordionItem>

			<AccordionItem value="elementos">
				<AccordionTrigger>
					<span>
						Rodapé, botões e conteúdo
						<ChangedBadge changed={changed.elementos} />
					</span>
				</AccordionTrigger>
				<AccordionContent className="flex flex-col gap-4">
					<RoleRow
						label="Fundo do rodapé"
						value={draft.footer.bg}
						options={ROLE_OPTIONS}
						swatches={roleSwatches}
						onChange={(bg) => patch({ footer: { bg } })}
					/>
					<RoleRow
						label="Fundo dos botões"
						value={draft.buttons.bg}
						options={ROLE_OPTIONS}
						swatches={roleSwatches}
						onChange={(bg) => patch({ buttons: { bg } })}
					/>
					<ColorSourceRow
						label="Destaque do conteúdo"
						value={draft.content.accent}
						options={ACCENT_OPTIONS}
						swatches={effectSwatches}
						onChange={(accent) =>
							patch({ content: { ...draft.content, accent } })
						}
					/>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<Label>Diferente no modo escuro</Label>
						<Switch
							checked={draft.content.accentDark !== null}
							onCheckedChange={(checked) =>
								patch({
									content: {
										...draft.content,
										accentDark: checked
											? "foreground"
											: null,
									},
								})
							}
						/>
					</div>
					{draft.content.accentDark !== null && (
						<ColorSourceRow
							label="Destaque no escuro"
							value={draft.content.accentDark}
							options={ACCENT_OPTIONS}
							swatches={effectSwatches}
							onChange={(accentDark) =>
								patch({
									content: { ...draft.content, accentDark },
								})
							}
						/>
					)}
					<p className="text-muted-foreground text-xs">
						Navegação ativa e selos da capa. O texto sobre o
						destaque é derivado por contraste.
					</p>
					<RoleRow
						label="Cor dos carregamentos"
						value={draft.content.skeleton}
						options={SKELETON_OPTIONS}
						swatches={{
							...roleSwatches,
							muted: "var(--muted)",
						}}
						onChange={(skeleton) =>
							patch({ content: { ...draft.content, skeleton } })
						}
					/>
					<SectionReset
						visible={changed.elementos}
						onReset={() =>
							patch({
								footer: DEFAULT_THEME.footer,
								buttons: DEFAULT_THEME.buttons,
								content: DEFAULT_THEME.content,
							})
						}
					/>
				</AccordionContent>
			</AccordionItem>

			<AccordionItem value="hero">
				<AccordionTrigger>
					<span>
						Capa (hero)
						<ChangedBadge changed={changed.hero} />
					</span>
				</AccordionTrigger>
				<AccordionContent className="flex flex-col gap-4">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<Label>Mostrar imagem da capa</Label>
						<Switch
							checked={draft.hero.image}
							onCheckedChange={(image) =>
								patch({ hero: { ...draft.hero, image } })
							}
						/>
					</div>
					{!draft.hero.image && (
						<p className="text-muted-foreground text-xs">
							Sem imagem, a capa não tem fundo nem véu: o tom vem
							do gradiente superior (altura “capa”) e o texto
							segue a página.
						</p>
					)}
					{draft.hero.image && (
						<>
							<RoleRow
								label="Cor sobre a capa"
								value={draft.hero.overlayColor}
								options={HERO_OVERLAY_OPTIONS}
								/*
								 * Amostra o tom realmente aplicado: a cor escolhida
								 * escurecida até passar AA contra o branco.
								 */
								swatches={heroSwatches}
								onChange={(overlayColor) =>
									patch({
										hero: { ...draft.hero, overlayColor },
									})
								}
							/>
							<RangeRow
								label="Intensidade da cor"
								value={draft.hero.overlayOpacity}
								min={0}
								max={0.85}
								step={0.05}
								onChange={(overlayOpacity) =>
									patch({
										hero: { ...draft.hero, overlayOpacity },
									})
								}
								format={(v) => `${Math.round(v * 100)}%`}
							/>
							<p className="text-muted-foreground text-xs">
								O texto da capa é sempre branco; a cor é
								escurecida automaticamente para manter a
								leitura.
							</p>
						</>
					)}
					<div className="flex flex-col gap-3 rounded-lg border p-3">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<Label>Filete inferior</Label>
							<Switch
								checked={draft.hero.border !== null}
								onCheckedChange={(checked) =>
									patch({
										hero: {
											...draft.hero,
											border: checked
												? {
														width: 4,
														color: "secondary" as const,
													}
												: null,
										},
									})
								}
							/>
						</div>
						{draft.hero.border && (
							<>
								<RangeRow
									label="Espessura"
									value={draft.hero.border.width}
									min={1}
									max={16}
									step={1}
									onChange={(width) =>
										patch({
											hero: {
												...draft.hero,
												border: {
													...draft.hero.border!,
													width,
												},
											},
										})
									}
									format={(v) => `${v}px`}
								/>
								<ColorSourceRow
									label="Cor"
									value={draft.hero.border.color}
									options={ACCENT_OPTIONS}
									swatches={effectSwatches}
									onChange={(color) =>
										patch({
											hero: {
												...draft.hero,
												border: {
													...draft.hero.border!,
													color,
												},
											},
										})
									}
								/>
							</>
						)}
					</div>
					<SectionReset
						visible={changed.hero}
						onReset={() => patch({ hero: DEFAULT_THEME.hero })}
					/>
				</AccordionContent>
			</AccordionItem>

			<AccordionItem value="fundo">
				<AccordionTrigger>
					<span>
						Fundo da página
						<ChangedBadge changed={changed.fundo} />
					</span>
				</AccordionTrigger>
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
								<SelectItem value="solid">
									Cor sólida
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					{draft.page.effect !== "none" && (
						<>
							<RoleRow
								label="Cor do efeito"
								value={draft.page.effectColor}
								options={EFFECT_COLOR_OPTIONS}
								swatches={effectSwatches}
								onChange={(effectColor) =>
									patch({
										page: { ...draft.page, effectColor },
									})
								}
							/>
							<RangeRow
								label="Tamanho"
								value={draft.page.effectSize}
								min={8}
								max={96}
								step={4}
								onChange={(effectSize) =>
									patch({
										page: { ...draft.page, effectSize },
									})
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
									patch({
										page: { ...draft.page, effectOpacity },
									})
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
						swatches={gradientSwatches}
					/>
					<GradientRow
						label="Gradiente inferior"
						value={draft.page.bottomGradient}
						onChange={(bottomGradient) =>
							patch({ page: { ...draft.page, bottomGradient } })
						}
						swatches={gradientSwatches}
						allowHeroHeight={false}
					/>
					<SectionReset
						visible={changed.fundo}
						onReset={() => patch({ page: DEFAULT_THEME.page })}
					/>
				</AccordionContent>
			</AccordionItem>

			<AccordionItem value="cartoes">
				<AccordionTrigger>
					<span>
						Cartões
						<ChangedBadge changed={changed.cartoes} />
					</span>
				</AccordionTrigger>
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
					<SectionReset
						visible={changed.cartoes}
						onReset={() => patch({ card: DEFAULT_THEME.card })}
					/>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}

function GradientRow({
	label,
	value,
	onChange,
	swatches,
	allowHeroHeight = true,
}: {
	label: string;
	value: EventTheme["page"]["topGradient"];
	onChange: (v: EventTheme["page"]["topGradient"]) => void;
	swatches: Partial<Record<ThemeColorSource, string | null>>;
	/** Só o gradiente superior acompanha a capa; o inferior é sempre fixo. */
	allowHeroHeight?: boolean;
}) {
	const enabled = value !== null;
	const g: PageGradient = value ?? {
		height: 240,
		from: { color: "primary", opacity: 0.35 },
		to: { color: "secondary", opacity: 0.35 },
	};
	const heroHeight = allowHeroHeight && g.height === "hero";
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
					{allowHeroHeight && (
						<div className="flex flex-wrap items-center justify-between gap-2">
							<Label>Altura acompanha a capa</Label>
							<Switch
								checked={heroHeight}
								onCheckedChange={(checked) =>
									onChange({
										...g,
										height: checked ? "hero" : 240,
									})
								}
							/>
						</div>
					)}
					{!heroHeight && (
						<RangeRow
							label="Altura"
							value={
								typeof g.height === "number" ? g.height : 240
							}
							min={0}
							max={1200}
							step={20}
							onChange={(height) => onChange({ ...g, height })}
							format={(v) => `${v}px`}
						/>
					)}
					{heroHeight && (
						<p className="text-muted-foreground text-xs">
							A capa desenha o gradiente do topo da página até o
							filete, em qualquer tamanho de tela.
						</p>
					)}
					<ColorSourceRow
						label="De"
						value={g.from.color}
						options={SOURCE_OPTIONS}
						swatches={swatches}
						onChange={(color) =>
							onChange({ ...g, from: { ...g.from, color } })
						}
						opacity={g.from.opacity}
						opacityLabel="Opacidade inicial"
						onOpacityChange={(opacity) =>
							onChange({ ...g, from: { ...g.from, opacity } })
						}
					/>
					<ColorSourceRow
						label="Para"
						value={g.to.color}
						options={SOURCE_OPTIONS}
						swatches={swatches}
						onChange={(color) =>
							onChange({ ...g, to: { ...g.to, color } })
						}
						opacity={g.to.opacity}
						opacityLabel="Opacidade final"
						onOpacityChange={(opacity) =>
							onChange({ ...g, to: { ...g.to, opacity } })
						}
					/>
				</>
			)}
		</div>
	);
}
