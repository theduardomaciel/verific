import { describe, expect, it } from "vitest";

import {
	getEffectiveTolerance,
	offersWaitlistSpot,
} from "@/lib/activity-conditions";

describe("offersWaitlistSpot", () => {
	it("oferece por padrão (dados antigos sem a coluna)", () => {
		expect(offersWaitlistSpot({})).toBe(true);
		expect(offersWaitlistSpot({ waitlistEnabled: null })).toBe(true);
		expect(offersWaitlistSpot({ waitlistEnabled: true })).toBe(true);
	});

	it("não oferece com a fila desligada", () => {
		expect(offersWaitlistSpot({ waitlistEnabled: false })).toBe(false);
	});
});

describe("getEffectiveTolerance", () => {
	it("devolve a tolerância salva com a fila ligada", () => {
		expect(
			getEffectiveTolerance({ waitlistEnabled: true, tolerance: 10 }),
		).toBe(10);
		expect(getEffectiveTolerance({ tolerance: 10 })).toBe(10);
	});

	it("esvazia a tolerância com a fila desligada, sem apagar o valor", () => {
		expect(
			getEffectiveTolerance({ waitlistEnabled: false, tolerance: 10 }),
		).toBeNull();
	});

	it("lê ausência como vazia", () => {
		expect(getEffectiveTolerance({})).toBeNull();
		expect(
			getEffectiveTolerance({ waitlistEnabled: false, tolerance: null }),
		).toBeNull();
	});
});
