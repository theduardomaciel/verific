import {
	Hanken_Grotesk,
	Inter,
	REM,
	Sora,
	Space_Grotesk,
} from "next/font/google";

import type { FontPreset } from "@verific/drizzle/theme";

export { FONT_FAMILIES } from "./presets";

/**
 * Fontes com curadoria (Fase 2). Todas via next/font: baixadas no build,
 * auto-hospedadas, sem requisição a terceiros em runtime e sem layout shift.
 */
const hankenGrotesk = Hanken_Grotesk({
	variable: "--font-hanken-grotesk",
	subsets: ["latin"],
});

const rem = REM({ variable: "--font-rem", subsets: ["latin"] });

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });

const spaceGrotesk = Space_Grotesk({
	variable: "--font-space-grotesk",
	subsets: ["latin"],
});

export const FONT_PRESETS: Record<FontPreset, { variable: string }> = {
	"hanken-grotesk": { variable: hankenGrotesk.variable },
	rem: { variable: rem.variable },
	inter: { variable: inter.variable },
	sora: { variable: sora.variable },
	"space-grotesk": { variable: spaceGrotesk.variable },
};
