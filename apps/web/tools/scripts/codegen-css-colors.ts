import fs from "node:fs";
import path from "node:path";

// Import the colors definition
// Note: You'll need to update this path based on your project structure
import themeColors from "../../theme/colors";

// Create output directory if it doesn't exist
const outputDir = path.resolve(process.cwd(), "theme/.generated");
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

// Generate CSS variables for base colors (not prefixed with $)
const baseColors = Object.entries(themeColors).flatMap(([group, value]) => {
	if (group.startsWith("$")) {
		return [];
	}

	if (typeof value === "string") {
		return `--color-${group}: ${value};`;
	}

	return [
		`\n/* --- ${group} --- */`,
		...Object.entries(value).map(([shade, value]) => {
			return `--color-${group}-${shade}: ${value};`;
		}),
	];
});

// Separate semantic colors into light and dark theme variables
type ColorTuple = [name: string, value: string];
const lightColors: ColorTuple[] = [];
const darkColors: ColorTuple[] = [];

Object.entries(themeColors).forEach(([name, value]) => {
	if (!name.startsWith("$") || typeof value !== "object") return [];

	// Remove the $ prefix and convert camelCase to kebab-case
	const cssName = name
		.slice(1)
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.toLowerCase();

	if ("light" in value) {
		lightColors.push([cssName, value.light]);
	}

	if ("dark" in value) {
		darkColors.push([cssName, value.dark]);
	}
});

// Create theme variables for light and dark modes
const themeVariables = {
	light: lightColors.map(([name, value]) => `--${name}: ${value};`),
	dark: darkColors.map(([name, value]) => `--${name}: ${value};`),
};

/**
 * A paleta clara vai para \`:root\` **e** para a classe \`.ev-theme-light\`.
 *
 * Razão: tokens customizados são herdados, então um elemento interno não
 * consegue "des-herdar" o modo do \`<html>\` — basta ele declarar a paleta
 * clara para que ela vença a herança. Isso permite à prévia do editor de
 * tema simular os dois modos dentro de uma página que segue o
 * \`next-themes\`, sem duplicar valores à mão. Ver \`@custom-variant dark\`
 * em \`globals.css\`, que usa a mesma classe para desligar as variantes
 * \`dark:\` dentro desse escopo.
 */
const LIGHT_SCOPE_SELECTOR = ":root, .ev-theme-light";

// Development-only fallback to dark colors for VSCode inline previews
const editorPreviewFallbacks = darkColors.map(
	([name, value]) => `--${name}: var(--${name}, ${value});`,
);

// Create references from --color-* to semantic variables
const colorVariableReferences = lightColors.map(([name]) => {
	return `--color-${name}: var(--${name});`;
});

// Generate the CSS content
const css = `
/*************************** DO NOT EDIT MANUALLY ***************************/
/* Auto-generated from 'colors.ts' with 'pnpm run codegen:css-colors' */

@theme {
  --color-*: initial;

  ${baseColors.join("\n")}
}

${LIGHT_SCOPE_SELECTOR} {
  ${themeVariables.light.join("\n  ")}
}

.dark {
  ${themeVariables.dark.join("\n  ")}
}

@theme inline {
  /*
    NOTE: This group of colors is only generated in development to help the
    VSCode Tailwind CSS extension show color previews within the editor
  */

  ${editorPreviewFallbacks.join("\n  ")}
}

@theme inline {
  ${colorVariableReferences.join("\n  ")}
}
`;

// Write the CSS to the output file as-is (no formatter dependency;
// the file is covered by `oxfmt` like any other source file).
try {
	fs.writeFileSync(path.resolve(outputDir, "colors.css"), css);
	console.log("✅ Generated CSS colors file successfully");
} catch (error) {
	console.error("Error generating CSS colors file:", error);
}
