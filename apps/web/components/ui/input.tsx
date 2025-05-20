import type * as React from "react";

import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/validations/masks/phone";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
				"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
				"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
				className,
			)}
			{...props}
		/>
	);
}

interface InputWithSuffixProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	suffix: string;
	containerClassName?: string;
}

function InputWithSuffix({
	suffix,
	className,
	containerClassName,
	...props
}: InputWithSuffixProps) {
	return (
		<div className={cn("relative flex items-center", containerClassName)}>
			<Input {...props} className={cn("pr-16", className)} />
			<span className="text-muted-foreground pointer-events-none absolute right-3 text-sm leading-none">
				{suffix}
			</span>
		</div>
	);
}

function PhoneInput({
	onChange,
	value,
	...props
}: React.ComponentProps<"input">) {
	// Handler para aplicar a máscara manualmente
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const formatted = formatPhone(e.target.value);
		if (onChange) {
			// Cria um novo evento com o valor formatado
			const event = {
				...e,
				target: {
					...e.target,
					value: formatted,
				},
			};
			onChange(event as React.ChangeEvent<HTMLInputElement>);
		}
	};

	return (
		<Input
			{...props}
			value={typeof value === "string" ? formatPhone(value) : value}
			onChange={handleChange}
			maxLength={15} // (99) 99999-9999
			inputMode="tel"
			placeholder="(xx) xxxxx-xxxx"
		/>
	);
}

export { Input, PhoneInput, InputWithSuffix };
