export type Ipv4Range = { base: number; mask: number };

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function ipv4ToInt(ip: string): number | null {
	const match = IPV4.exec(ip);
	if (!match) return null;
	const octets = match.slice(1).map(Number);
	if (octets.some((octet) => octet > 255)) return null;
	return octets.reduce((value, octet) => value * 256 + octet, 0);
}

/**
 * IPs/faixas IPv4 em CIDR, separados por vírgula (`a.b.c.d` vale como /32).
 * Lança com a entrada inválida: uma faixa digitada errado falha no boot em
 * vez de ser ignorada.
 */
export function parseIpv4Ranges(value: string | undefined): Ipv4Range[] {
	if (!value) return [];
	return value
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((entry) => {
			const [ip = "", prefixText = "32", ...rest] = entry.split("/");
			const base = ipv4ToInt(ip);
			const prefix = /^\d{1,2}$/.test(prefixText)
				? Number(prefixText)
				: -1;
			if (base === null || rest.length > 0 || prefix < 0 || prefix > 32) {
				throw new Error(`Faixa IPv4 inválida: "${entry}"`);
			}
			const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
			return { base: (base & mask) >>> 0, mask };
		});
}

export function ipInRanges(
	ip: string | null | undefined,
	ranges: readonly Ipv4Range[],
): boolean {
	if (!ip || ranges.length === 0) return false;
	const value = ipv4ToInt(ip);
	if (value === null) return false;
	return ranges.some(({ base, mask }) => (value & mask) >>> 0 === base);
}
