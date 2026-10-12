import { z } from "@verific/zod";

/**
 * Badge layout stored as ONE versioned, Zod-validated jsonb.
 * Canonical unit: millimetres (floats). Convert to pt only at render time.
 */

export const BADGE_LAYOUT_VERSION = 1 as const;

const rectRelativeSchema = z.object({
	x: z.number().min(0).max(1),
	y: z.number().min(0).max(1),
	w: z.number().min(0).max(1),
	h: z.number().min(0).max(1),
});

const freeAreaSchema = z.object({
	x: z.number().min(0),
	y: z.number().min(0),
	w: z.number().positive(),
	h: z.number().positive(),
	radius: z.number().min(0).default(3),
	padding: z.number().min(0).default(3),
});

const fontRoleSchema = z.enum(["heading", "subtitle", "body"]);

const textItemSchema = z.object({
	kind: z.literal("text"),
	id: z.string().min(1),
	enabled: z.boolean().default(true),
	rect: rectRelativeSchema,
	/** "name", a form field id, or "" when unbound (omitted at render). */
	source: z.string().max(64).default(""),
	label: z.string().max(80).default(""),
	align: z.enum(["left", "center", "right"]).default("center"),
	fontRole: fontRoleSchema.default("body"),
	fontSizePt: z.number().min(4).max(144).default(18),
	minFontSizePt: z.number().min(4).max(144).default(10),
	weight: z.number().int().min(100).max(900).default(700),
	color: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.default("#111111"),
	maxLines: z.number().int().min(1).max(5).default(2),
});

const qrItemSchema = z.object({
	kind: z.literal("qr"),
	id: z.string().min(1),
	enabled: z.boolean().default(true),
	rect: rectRelativeSchema,
	/** Quiet zone in modules (≥4). */
	quietModules: z.number().int().min(4).max(8).default(4),
});

const logoItemSchema = z.object({
	kind: z.literal("logo"),
	id: z.string().min(1),
	enabled: z.boolean().default(true),
	rect: rectRelativeSchema,
	imageUrl: z.string().url().or(z.literal("")).default(""),
});

export const badgeItemSchema = z.discriminatedUnion("kind", [
	textItemSchema,
	qrItemSchema,
	logoItemSchema,
]);
export type BadgeItem = z.infer<typeof badgeItemSchema>;

export const badgeLayoutSchema = z.object({
	version: z.literal(BADGE_LAYOUT_VERSION).default(BADGE_LAYOUT_VERSION),
	mode: z.enum(["data-only", "full"]).default("data-only"),
	artworkUrl: z.string().url().or(z.literal("")).default(""),
	artworkKind: z.enum(["png", "jpg", "pdf", "svg"]).default("png"),
	/** Intrinsic raster size (px) for dpi warning; null for vector. */
	artworkPixels: z
		.object({
			w: z.number().int().positive(),
			h: z.number().int().positive(),
		})
		.nullable()
		.default(null),
	badgeW: z.number().positive().default(90),
	badgeH: z.number().positive().default(55),
	freeArea: freeAreaSchema.default({
		x: 5,
		y: 5,
		w: 80,
		h: 45,
		radius: 3,
		padding: 3,
	}),
	freeAreaBg: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.default("#FFFFFF"),
	items: z.array(badgeItemSchema).default([]),
	page: z
		.object({
			size: z.enum(["a4", "letter", "custom"]).default("a4"),
			customW: z.number().positive().nullable().default(null),
			customH: z.number().positive().nullable().default(null),
			marginMm: z.number().min(0).max(50).default(10),
			gutterMm: z.number().min(0).max(50).default(5),
			bleedMm: z.number().min(0).max(10).default(0),
			cropMarks: z.boolean().default(true),
		})
		.default({
			size: "a4",
			customW: null,
			customH: null,
			marginMm: 10,
			gutterMm: 5,
			bleedMm: 0,
			cropMarks: true,
		}),
	manualGrid: z
		.object({
			enabled: z.boolean().default(false),
			cols: z.number().int().min(1).max(20).default(2),
			rows: z.number().int().min(1).max(20).default(4),
			originX: z.number().min(0).default(10),
			originY: z.number().min(0).default(10),
		})
		.default({
			enabled: false,
			cols: 2,
			rows: 4,
			originX: 10,
			originY: 10,
		}),
	calibration: z
		.object({
			dx: z.number().min(-20).max(20).default(0),
			dy: z.number().min(-20).max(20).default(0),
		})
		.default({ dx: 0, dy: 0 }),
});

export type BadgeLayout = z.infer<typeof badgeLayoutSchema>;

/** Default centered stack: name, secondary text, QR. */
export function defaultBadgeItems(): BadgeItem[] {
	return [
		{
			kind: "text",
			id: "name",
			enabled: true,
			rect: { x: 0.1, y: 0.06, w: 0.8, h: 0.22 },
			source: "name",
			label: "Nome",
			align: "center",
			fontRole: "heading",
			fontSizePt: 20,
			minFontSizePt: 10,
			weight: 700,
			color: "#111111",
			maxLines: 2,
		},
		{
			kind: "text",
			id: "secondary-1",
			enabled: true,
			rect: { x: 0.1, y: 0.3, w: 0.8, h: 0.14 },
			source: "",
			label: "Linha secundária",
			align: "center",
			fontRole: "body",
			fontSizePt: 11,
			minFontSizePt: 7,
			weight: 400,
			color: "#333333",
			maxLines: 2,
		},
		{
			kind: "qr",
			id: "qr",
			enabled: true,
			rect: { x: 0.35, y: 0.48, w: 0.3, h: 0.46 },
			quietModules: 4,
		},
	];
}
