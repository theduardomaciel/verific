"use client";

import { ptToMm, type DisplayPrimitive } from "@verific/badges";

interface Props {
	primitives: DisplayPrimitive[];
	badgeWMm: number;
	badgeHMm: number;
	/** px per mm (3.7795 = full scale at 96dpi). */
	pxPerMm: number;
	artworkUrl?: string;
	artworkKind?: string;
	/** Full badge mode prints the artwork; data-only shows it dimmed. */
	mode: "data-only" | "full";
}

/**
 * Renderiza a display list (mesmas coordenadas em mm do PDF).
 * Usado pela prévia e pelo canvas do editor, para ambos mostrarem
 * exatamente o que será impresso.
 */
export function PrimitiveLayer({
	primitives,
}: {
	primitives: DisplayPrimitive[];
}) {
	return (
		<>
			{primitives.map((p, i) => {
				if (p.kind === "rect") {
					return (
						<rect
							key={i}
							x={p.rect.x}
							y={p.rect.y}
							width={p.rect.w}
							height={p.rect.h}
							rx={p.radiusMm}
							fill={p.fill}
						/>
					);
				}
				if (p.kind === "text") {
					const sizeMm = ptToMm(p.fontSizePt);
					const lineMm = ptToMm(p.lineHeightPt);
					const anchor =
						p.align === "center"
							? "middle"
							: p.align === "right"
								? "end"
								: "start";
					const ax =
						p.align === "center"
							? p.xMm + p.maxWidthMm / 2
							: p.align === "right"
								? p.xMm + p.maxWidthMm
								: p.xMm;
					return (
						<text
							key={i}
							x={ax}
							y={p.yMm + sizeMm}
							textAnchor={anchor}
							fontFamily={`"${p.family}", sans-serif`}
							fontSize={sizeMm}
							fontWeight={p.weight}
							fill={p.color}
						>
							{p.lines.map((line, li) => (
								<tspan
									key={li}
									x={ax}
									dy={li === 0 ? 0 : lineMm}
								>
									{line}
								</tspan>
							))}
						</text>
					);
				}
				if (p.kind === "qr") {
					const n = p.modules.length;
					const total = n + p.quietModules * 2;
					const cell = p.rect.w / total;
					const cells: React.ReactNode[] = [];
					for (let r = 0; r < n; r++) {
						for (let c = 0; c < n; c++) {
							if (!p.modules[r]?.[c]) continue;
							cells.push(
								<rect
									key={`${r}-${c}`}
									x={p.rect.x + (c + p.quietModules) * cell}
									y={p.rect.y + (r + p.quietModules) * cell}
									width={cell + 0.01}
									height={cell + 0.01}
									fill="#000"
								/>,
							);
						}
					}
					return (
						<g key={i}>
							<rect
								x={p.rect.x}
								y={p.rect.y}
								width={p.rect.w}
								height={p.rect.h}
								fill="#fff"
							/>
							{cells}
						</g>
					);
				}
				if (p.kind === "image" && p.url && p.url !== "__artwork__") {
					return (
						<image
							key={i}
							href={p.url}
							x={p.rect.x}
							y={p.rect.y}
							width={p.rect.w}
							height={p.rect.h}
							preserveAspectRatio="xMidYMid meet"
						/>
					);
				}
				return null;
			})}
		</>
	);
}

/**
 * Pré-visualização fiel: rende a mesma display list do PDF, nas mesmas
 * coordenadas em mm. Texto usa as fontes TTF registradas via FontFace.
 */
export function BadgePreviewSvg({
	primitives,
	badgeWMm,
	badgeHMm,
	pxPerMm,
	artworkUrl,
	artworkKind,
	mode,
}: Props) {
	const w = badgeWMm * pxPerMm;
	const h = badgeHMm * pxPerMm;
	const showArtwork =
		artworkUrl && (artworkKind === "png" || artworkKind === "jpg");

	return (
		<svg
			width={w}
			height={h}
			viewBox={`0 0 ${badgeWMm} ${badgeHMm}`}
			className="bg-white shadow-md"
			role="img"
			aria-label="Prévia do crachá"
		>
			{showArtwork ? (
				<image
					href={artworkUrl}
					x={0}
					y={0}
					width={badgeWMm}
					height={badgeHMm}
					preserveAspectRatio="none"
					opacity={mode === "full" ? 1 : 0.45}
				/>
			) : null}
			<PrimitiveLayer primitives={primitives} />
		</svg>
	);
}
