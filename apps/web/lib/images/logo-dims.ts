import type { RouterInputs } from "@verific/api";

export interface ImageDims {
	width: number;
	height: number;
}

export type LogoUrlField =
	| "logoUrl"
	| "logoDarkUrl"
	| "largeLogoUrl"
	| "largeLogoDarkUrl";

type UpdateProjectInput = RouterInputs["updateProject"];

type LogoDimsInput = Pick<
	UpdateProjectInput,
	| "logoSide"
	| "logoDarkSide"
	| "largeLogoWidth"
	| "largeLogoHeight"
	| "largeLogoDarkWidth"
	| "largeLogoDarkHeight"
>;

/**
 * Fragmento de dimensões p/ `updateProject` a partir do meta medido no
 * upload (`ImageUploader.onChange`). `undefined` = campo intocado (fora
 * da mutação); `null` = logo removido (zera as colunas). Os logos
 * quadrados guardam só o lado (sempre 1:1 pelo padding no upload).
 */
export function logoDimsInput(
	field: LogoUrlField,
	meta: ImageDims | null | undefined,
): Partial<LogoDimsInput> | undefined {
	if (meta === undefined) return undefined;
	switch (field) {
		case "logoUrl":
			return { logoSide: meta?.width ?? null };
		case "logoDarkUrl":
			return { logoDarkSide: meta?.width ?? null };
		case "largeLogoUrl":
			return {
				largeLogoWidth: meta?.width ?? null,
				largeLogoHeight: meta?.height ?? null,
			};
		case "largeLogoDarkUrl":
			return {
				largeLogoDarkWidth: meta?.width ?? null,
				largeLogoDarkHeight: meta?.height ?? null,
			};
	}
}
