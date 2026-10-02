"use client";

import { useEffect, useMemo, useState } from "react";
import {
	AsYouType,
	getCountries,
	getCountryCallingCode,
	parsePhoneNumberFromString,
	type CountryCode,
} from "libphonenumber-js";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

export interface PhoneCountry {
	iso: CountryCode;
	code: string;
	flag: string;
	name: string;
}

function flagEmoji(iso: string): string {
	return String.fromCodePoint(
		...[...iso.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)),
	);
}

const regionNames = new Intl.DisplayNames(["pt-BR"], { type: "region" });

export const phoneCountries: PhoneCountry[] = getCountries()
	.map((iso) => {
		let code: string;
		try {
			code = getCountryCallingCode(iso);
		} catch {
			return null;
		}
		return {
			iso,
			code,
			flag: flagEmoji(iso),
			name: regionNames.of(iso) ?? iso,
		};
	})
	.filter((c): c is PhoneCountry => c !== null)
	.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

const DEFAULT_ISO: CountryCode = "BR";

function countryIsoForValue(value: string): CountryCode {
	if (value.trim().startsWith("+")) {
		return parsePhoneNumberFromString(value)?.country ?? DEFAULT_ISO;
	}
	return DEFAULT_ISO;
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
 * Phone input with searchable country selector (flag + dial code).
 * Brazil (+55) is the default. Typing is formatted live with
 * `AsYouType` using the selected country's rules, and the emitted
 * value is the normalized E.164 number (e.g. "+5582999999999"),
 * or "" when empty.
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
	const [countryIso, setCountryIso] =
		useState<CountryCode>(() => countryIsoForValue(raw));
	const country =
		phoneCountries.find((c) => c.iso === countryIso) ??
		phoneCountries.find((c) => c.iso === DEFAULT_ISO)!;

	// Follow externally provided values (e.g. loaded answers) that carry
	// a different country prefix.
	useEffect(() => {
		if (raw.trim().startsWith("+")) {
			const parsed = countryIsoForValue(raw);
			if (parsed !== countryIso) setCountryIso(parsed);
		}
	}, [raw, countryIso]);

	const national = useMemo(
		() => new AsYouType(country.iso).input(raw),
		[raw, country.iso],
	);

	function emit(nextIso: CountryCode, text: string) {
		setCountryIso(nextIso);
		if (!text.replace(/\D/g, "")) {
			onChange("");
			return;
		}
		const formatted = new AsYouType(nextIso).input(text);
		const parsed =
			parsePhoneNumberFromString(formatted, nextIso) ??
			parsePhoneNumberFromString(text, nextIso);
		onChange(parsed?.number ?? formatted);
	}

	return (
		<div className={cn("flex gap-2", className)}>
			<div className="w-[9.5rem] shrink-0">
				<Combobox
					value={country.iso}
					disabled={disabled}
					placeholder="País"
					searchMessage="Buscar país..."
					emptyMessage="Nenhum país encontrado."
					items={phoneCountries.map((c) => ({
						label: `${c.flag} +${c.code}`,
						value: c.iso,
						keywords: [c.name, c.iso, c.code, `+${c.code}`],
					}))}
					onChange={(iso) => {
						const next = phoneCountries.find((c) => c.iso === iso);
						if (!next) return;
						const current = parsePhoneNumberFromString(
							raw,
							country.iso,
						);
						emit(next.iso, current?.nationalNumber ?? raw);
					}}
				/>
			</div>
			<Input
				name={name}
				disabled={disabled}
				value={national}
				inputMode="tel"
				placeholder={placeholder}
				onChange={(e) => emit(country.iso, e.target.value)}
				onBlur={onBlur}
			/>
		</div>
	);
}
