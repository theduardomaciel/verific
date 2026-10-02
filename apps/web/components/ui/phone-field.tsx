"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
	const country = useMemo(() => findCountryForValue(raw), [raw]);
	const national = useMemo(
		() => formatNational(nationalDigits(raw, country), country),
		[raw, country],
	);

	function emit(countryCode: string, digits: string) {
		if (!digits) {
			onChange("");
			return;
		}
		const target = phoneCountries.find((c) => c.code === countryCode);
		onChange(
			`+${countryCode} ${formatNational(digits, target ?? DEFAULT_COUNTRY)}`,
		);
	}

	return (
		<div className={cn("flex gap-2", className)}>
			<Select
				disabled={disabled}
				value={country.code}
				onValueChange={(code) =>
					emit(code, nationalDigits(raw, country))
				}
			>
				<SelectTrigger
					aria-label="País"
					className="w-[7.5rem] shrink-0"
				>
					<SelectValue>
						<span>
							{country.flag} +{country.code}
						</span>
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{phoneCountries.map((c) => (
						<SelectItem key={c.iso} value={c.code}>
							<span>
								{c.flag} {c.name} (+{c.code})
							</span>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
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
