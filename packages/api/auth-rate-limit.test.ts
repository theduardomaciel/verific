import { describe, expect, it } from "vitest";

import { ipInRanges, parseIpv4Ranges } from "@verific/auth/ip-ranges";

// Só endereços de documentação (RFC 5737)
describe("parseIpv4Ranges", () => {
	it("sem valor, não relaxa nenhuma faixa", () => {
		expect(parseIpv4Ranges(undefined)).toEqual([]);
		expect(parseIpv4Ranges("")).toEqual([]);
		expect(parseIpv4Ranges(" , ")).toEqual([]);
	});

	it("aceita IP solto e CIDR, com espaços", () => {
		expect(parseIpv4Ranges(" 192.0.2.10 , 198.51.100.0/24 ")).toHaveLength(
			2,
		);
	});

	it("recusa entradas inválidas citando a entrada", () => {
		for (const value of [
			"300.1.1.1",
			"192.0.2.1/33",
			"192.0.2.1/",
			"192.0.2.1/8/1",
			"campus",
			"2001:db8::/32",
		]) {
			expect(() => parseIpv4Ranges(value)).toThrow(value);
		}
	});
});

describe("ipInRanges", () => {
	const ranges = parseIpv4Ranges("192.0.2.10, 198.51.100.0/24");

	it("casa IP solto (/32) e faixa", () => {
		expect(ipInRanges("192.0.2.10", ranges)).toBe(true);
		expect(ipInRanges("198.51.100.0", ranges)).toBe(true);
		expect(ipInRanges("198.51.100.255", ranges)).toBe(true);
	});

	it("não casa fora das faixas", () => {
		expect(ipInRanges("192.0.2.11", ranges)).toBe(false);
		expect(ipInRanges("198.51.101.1", ranges)).toBe(false);
		expect(ipInRanges("203.0.113.5", ranges)).toBe(false);
	});

	it("IPv6, valor inválido ou ausente não casam", () => {
		expect(ipInRanges("2001:db8::1", ranges)).toBe(false);
		expect(ipInRanges("not-an-ip", ranges)).toBe(false);
		expect(ipInRanges(null, ranges)).toBe(false);
		expect(ipInRanges("192.0.2.10", [])).toBe(false);
	});

	it("/0 casa qualquer IPv4", () => {
		expect(ipInRanges("203.0.113.5", parseIpv4Ranges("0.0.0.0/0"))).toBe(
			true,
		);
	});
});
