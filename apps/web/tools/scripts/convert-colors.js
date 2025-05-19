const { oklch } = require("culori");

// Converte HEX → OKLCH como string com ajustes para zeros
function hexToOklchString(hex) {
	const color = oklch(hex);
	if (!color) return null;

	let { l, c, h } = color;

	l = +l.toFixed(4);
	c = +c.toFixed(4);
	h = h !== undefined && !isNaN(h) ? +h.toFixed(2) : 0;

	// Zera valores muito pequenos
	if (l === 0) l = 0;
	if (c === 0) c = 0;

	return `oklch(${l} ${c} ${h})`;
}

// Exemplo de cores (adicione todas que desejar)
const colors = {
	Gray: {
		50: {
			$type: "color",
			$value: "#f9fafb",
		},
		100: {
			$type: "color",
			$value: "#f3f4f6",
		},
		200: {
			$type: "color",
			$value: "#e5e7eb",
		},
		300: {
			$type: "color",
			$value: "#d1d5db",
		},
		400: {
			$type: "color",
			$value: "#9ca3af",
		},
		500: {
			$type: "color",
			$value: "#6b7280",
		},
		600: {
			$type: "color",
			$value: "#4b5563",
		},
		700: {
			$type: "color",
			$value: "#374151",
		},
		800: {
			$type: "color",
			$value: "#1f2937",
		},
		900: {
			$type: "color",
			$value: "#111827",
		},
		950: {
			$type: "color",
			$value: "#030712",
		},
	},
	Neutral: {
		50: {
			$type: "color",
			$value: "#fafafa",
		},
		100: {
			$type: "color",
			$value: "#f5f5f5",
		},
		200: {
			$type: "color",
			$value: "#e5e5e5",
		},
		300: {
			$type: "color",
			$value: "#d4d4d4",
		},
		400: {
			$type: "color",
			$value: "#a3a3a3",
		},
		500: {
			$type: "color",
			$value: "#737373",
		},
		600: {
			$type: "color",
			$value: "#525252",
		},
		700: {
			$type: "color",
			$value: "#404040",
		},
		800: {
			$type: "color",
			$value: "#262626",
		},
		900: {
			$type: "color",
			$value: "#171717",
		},
		950: {
			$type: "color",
			$value: "#0a0a0a",
		},
	},
	Red: {
		50: {
			$type: "color",
			$value: "#fef2f2",
		},
		100: {
			$type: "color",
			$value: "#fee2e2",
		},
		200: {
			$type: "color",
			$value: "#fecaca",
		},
		300: {
			$type: "color",
			$value: "#fca5a5",
		},
		400: {
			$type: "color",
			$value: "#f87171",
		},
		500: {
			$type: "color",
			$value: "#ef4444",
		},
		600: {
			$type: "color",
			$value: "#dc2626",
		},
		700: {
			$type: "color",
			$value: "#b91c1c",
		},
		800: {
			$type: "color",
			$value: "#991b1b",
		},
		900: {
			$type: "color",
			$value: "#7f1d1d",
		},
		950: {
			$type: "color",
			$value: "#450a0a",
		},
	},
	Blue: {
		50: {
			$type: "color",
			$value: "#eff6ff",
		},
		100: {
			$type: "color",
			$value: "#dbeafe",
		},
		200: {
			$type: "color",
			$value: "#bfdbfe",
		},
		300: {
			$type: "color",
			$value: "#93c5fd",
		},
		400: {
			$type: "color",
			$value: "#60a5fa",
		},
		500: {
			$type: "color",
			$value: "#3b82f6",
		},
		600: {
			$type: "color",
			$value: "#2563eb",
		},
		700: {
			$type: "color",
			$value: "#1d4ed8",
		},
		800: {
			$type: "color",
			$value: "#1e40af",
		},
		900: {
			$type: "color",
			$value: "#1e3a8a",
		},
		950: {
			$type: "color",
			$value: "#172554",
		},
	},
};

// Gera a saída no formato desejado
const result = {};

for (const category in colors) {
	result[category] = {};

	for (const shade in colors[category]) {
		const hex = colors[category][shade]["$value"];
		const oklchStr = hexToOklchString(hex);
		result[category][shade] = oklchStr;
	}
}

console.log(JSON.stringify(result, null, 2));
