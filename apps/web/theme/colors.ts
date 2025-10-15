import twColors from "tailwindcss/colors";

const customColors = {
	red: {
		"50": "oklch(0.9705 0.0129 17.38)",
		"100": "oklch(0.9356 0.0309 17.72)",
		"200": "oklch(0.8845 0.0593 18.33)",
		"300": "oklch(0.8077 0.1035 19.57)",
		"400": "oklch(0.7106 0.1661 22.22)",
		"500": "oklch(0.6368 0.2078 25.33)",
		"600": "oklch(0.5771 0.2152 27.33)",
		"700": "oklch(0.5054 0.1905 27.52)",
		"800": "oklch(0.4437 0.1613 26.9)",
		"900": "oklch(0.3958 0.1331 25.72)",
		"950": "oklch(0.2575 0.0886 26.04)",
	},
	blue: {
		"50": "oklch(0.9705 0.0142 254.6)",
		"100": "oklch(0.9319 0.0316 255.59)",
		"200": "oklch(0.8823 0.0571 254.13)",
		"300": "oklch(0.8091 0.0956 251.81)",
		"400": "oklch(0.7137 0.1434 254.62)",
		"500": "oklch(0.6231 0.188 259.81)",
		"600": "oklch(0.5461 0.2152 262.88)",
		"700": "oklch(0.4882 0.2172 264.38)",
		"800": "oklch(0.4244 0.1809 265.64)",
		"900": "oklch(0.3791 0.1378 265.52)",
		"950": "oklch(0.2823 0.0874 267.94)",
	},
	gray: {
		"50": "oklch(0.9846 0.0017 247.84)",
		"100": "oklch(0.967 0.0029 264.54)",
		"200": "oklch(0.9276 0.0058 264.53)",
		"300": "oklch(0.8717 0.0093 258.34)",
		"400": "oklch(0.7137 0.0192 261.32)",
		"500": "oklch(0.551 0.0234 264.36)",
		"600": "oklch(0.4461 0.0263 256.8)",
		"700": "oklch(0.3729 0.0306 259.73)",
		"800": "oklch(0.2781 0.0296 256.85)",
		"900": "oklch(0.2101 0.0318 264.66)",
		"950": "oklch(0.1296 0.0274 261.69)",
	},
	neutral: {
		"50": "oklch(0.9851 0 0)",
		"100": "oklch(0.9702 0 0)",
		"200": "oklch(0.9219 0 0)",
		"300": "oklch(0.8699 0 0)",
		"400": "oklch(0.7155 0 0)",
		"500": "oklch(0.5555 0 0)",
		"600": "oklch(0.4386 0 0)",
		"700": "oklch(0.3715 0 0)",
		"800": "oklch(0.2686 0 0)",
		"900": "oklch(0.2046 0 0)",
		"950": "oklch(0.1448 0 0)",
	},
};

const baseColors = {
	black: twColors.black,
	white: twColors.white,
	transparent: twColors.transparent,
	green: twColors.green,
	yellow: twColors.yellow,

	brand: customColors.blue,
	neutral: customColors.neutral,
	gray: customColors.gray,
	red: customColors.red,
} as const;

// Define semantic colors that will change based on dark/light mode
// Prefixed with $ to mark them as semantic variables
const allColors = {
	...baseColors,

	"$success-bg": {
		light: "hsl(143, 85%, 96%)",
		dark: "hsl(150, 100%, 6%)",
	},
	"$success-border": {
		light: "hsl(145, 92%, 87%)",
		dark: "hsl(147, 100%, 12%)",
	},
	"$success-text": {
		light: "hsl(140, 100%, 27%)",
		dark: "hsl(150, 86%, 65%)",
	},

	/***********************************************************/
	/* Semantic, light/dark color groups are prefixed with `$` */
	/***********************************************************/

	$background: {
		light: baseColors.white,
		dark: baseColors.neutral[900],
	},
	$foreground: {
		light: "oklch(0.3211 0 0)",
		dark: baseColors.neutral[200],
	},
	$card: {
		light: baseColors.white,
		dark: baseColors.neutral[800],
	},
	$cardForeground: {
		light: "oklch(0.3211 0 0)",
		dark: baseColors.neutral[200],
	},
	$popover: {
		light: baseColors.white,
		dark: baseColors.neutral[800],
	},
	$popoverForeground: {
		light: "oklch(0.3211 0 0)",
		dark: baseColors.neutral[200],
	},
	$primary: {
		light: baseColors.brand[500],
		dark: baseColors.brand[500],
	},
	$primaryForeground: {
		light: baseColors.white,
		dark: baseColors.neutral[200],
	},
	$secondary: {
		light: baseColors.gray[100],
		dark: baseColors.neutral[800],
	},
	$secondaryForeground: {
		light: baseColors.gray[600],
		dark: baseColors.neutral[200],
	},
	$muted: {
		light: baseColors.gray[50],
		dark: baseColors.neutral[800],
	},
	$mutedForeground: {
		light: baseColors.gray[500],
		dark: baseColors.neutral[400],
	},
	$accent: {
		light: baseColors.brand[100],
		dark: baseColors.brand[900],
	},
	$accentForeground: {
		light: baseColors.brand[900],
		dark: baseColors.brand[200],
	},
	$destructive: {
		light: baseColors.red[500],
		dark: baseColors.red[900],
	},
	$destructiveForeground: {
		light: baseColors.white,
		dark: baseColors.white,
	},
	$border: {
		light: baseColors.gray[200],
		dark: baseColors.neutral[700],
	},
	$input: {
		light: baseColors.gray[200],
		dark: baseColors.neutral[700],
	},
	$ring: {
		light: baseColors.brand[500],
		dark: baseColors.brand[500],
	},
} as const;

export default allColors;
