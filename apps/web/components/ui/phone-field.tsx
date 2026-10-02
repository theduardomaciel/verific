"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { formatPhone } from "@/lib/validations/masks/phone";
import { cn } from "@/lib/utils";

interface Country {
	iso: string;
	code: string;
	flag: string;
	name: string;
}

export const phoneCountries: Country[] = [
	{ iso: "BR", code: "55", flag: "🇧🇷", name: "Brasil" },
	{ iso: "US", code: "1", flag: "🇺🇸", name: "Estados Unidos" },
	{ iso: "PT", code: "351", flag: "🇵🇹", name: "Portugal" },
	{ iso: "AR", code: "54", flag: "🇦🇷", name: "Argentina" },
	{ iso: "CL", code: "56", flag: "🇨🇱", name: "Chile" },
	{ iso: "CO", code: "57", flag: "🇨🇴", name: "Colômbia" },
	{ iso: "MX", code: "52", flag: "🇲🇽", name: "México" },
	{ iso: "PY", code: "595", flag: "🇵🇾", name: "Paraguai" },
	{ iso: "UY", code: "598", flag: "🇺🇾", name: "Uruguai" },
	{ iso: "ES", code: "34", flag: "🇪🇸", name: "Espanha" },
	{ iso: "FR", code: "33", flag: "🇫🇷", name: "França" },
	{ iso: "DE", code: "49", flag: "🇩🇪", name: "Alemanha" },
	{ iso: "IT", code: "39", flag: "🇮🇹", name: "Itália" },
	{ iso: "GB", code: "44", flag: "🇬🇧", name: "Reino Unido" },
];

const DEFAULT_COUNTRY = phoneCountries[0]!;

function findCountryForValue(value: string): Country {
	if (value.startsWith("+")) {
		const digits = value.slice(1).replace(/\D/g, "");
		// Longest dial-code match first (e.g. 598 before 59).
		const sorted = [...phoneCountries].sort(
			(a, b) => b.code.length - a.code.length,
		);
		for (const c of sorted) {
			if (digits.startsWith(c.code)) return c;
		}
	}
	return DEFAULT_COUNTRY;
}

function nationalDigits(value: string, country: Country): string {
	let digits = value.replace(/\D/g, "");
	if (value.trim().startsWith("+") && digits.startsWith(country.code)) {
		digits = digits.slice(country.code.length);
	}
	return digits.slice(0, 15);
}

function formatNational(digits: string, country: Country): string {
	if (country.iso === "BR") return formatPhone(digits);
	return digits;
}

interface PhoneFieldProps {
	value?: string;
	onChange: (value: string) => void;
	onBlur?: () => void;
	name?: string;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
}

/**
 * Phone input with country selector (flag + dial code).
 * Brazil (+55) is the default. The emitted value is the full
 * international string, e.g. "+55 (11) 99999-9999", or "" when empty.
 */
export function PhoneField({
	value,
	onChange,
	onBlur,
	name,
	disabled,
	placeholder = "(11) 99999-9999",
	className,
}: PhoneFieldProps) {
	const raw = value ?? "";
	// Country is state, not derived from the value: with an empty number
	// there is no prefix to parse, so deriving it would snap the selection
	// back to Brazil on every pick.
	const [countryCode, setCountryCode] = useState(
		() => findCountryForValue(raw).code,
	);
	const country =
		phoneCountries.find((c) => c.code === countryCode) ?? DEFAULT_COUNTRY;

	// Follow externally provided values (e.g. loaded answers) that carry
	// a different country prefix.
	useEffect(() => {
		if (raw.trim().startsWith("+")) {
			const parsed = findCountryForValue(raw);
			if (parsed.code !== countryCode) setCountryCode(parsed.code);
		}
	}, [raw, countryCode]);

	const national = useMemo(
		() => formatNational(nationalDigits(raw, country), country),
		[raw, country],
	);

	function emit(nextCountryCode: string, digits: string) {
		setCountryCode(nextCountryCode);
		if (!digits) {
			onChange("");
			return;
		}
		const target = phoneCountries.find((c) => c.code === nextCountryCode);
		onChange(
			`+${nextCountryCode} ${formatNational(digits, target ?? DEFAULT_COUNTRY)}`,
		);
	}

	return (
		<div className={cn("flex gap-2", className)}>
			<div className="w-[9.5rem] shrink-0">
				<Combobox
					value={country.code}
					disabled={disabled}
					placeholder="País"
					searchMessage="Buscar país..."
					emptyMessage="Nenhum país encontrado."
					items={phoneCountries.map((c) => ({
						label: `${c.flag} +${c.code}`,
						value: c.code,
						keywords: [c.name, c.iso, c.code, `+${c.code}`],
					}))}
					onChange={(code) => {
						if (code) emit(code, nationalDigits(raw, country));
					}}
				/>
			</div>
			<Input
				name={name}
				disabled={disabled}
				value={national}
				inputMode="tel"
				placeholder={placeholder}
				onChange={(e) =>
					emit(
						country.code,
						e.target.value.replace(/\D/g, "").slice(0, 15),
					)
				}
				onBlur={onBlur}
			/>
		</div>
	);
}
