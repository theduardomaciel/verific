"use client";

import { Search, Loader2, X } from "lucide-react";

import { Input } from "@/components/ui/input";

import { useControlledParam } from "@/hooks/use-controlled-param";
import { cn } from "@/lib/utils";

interface SearchBarProps extends Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	"onChange"
> {
	prefix?: string;
	debounce?: number;
	/** Keys to reset when search changes (e.g., reset page to 1) */
	resetKeys?: Array<{ key: string; defaultValue: string }>;
	// Client-Driven: forneça ambas para gerenciar estado no pai
	value?: string;
	onChange?: (value: string) => void;
	/** Classes do wrapper (controla a largura; padrão: w-full) */
	className?: string;
	/** Classes aplicadas diretamente no <input> */
	inputClassName?: string;
}

export function SearchBar({
	prefix = "query",
	debounce = 500,
	value,
	onChange,
	resetKeys = [{ key: "page", defaultValue: "1" }],
	className,
	inputClassName,
	placeholder,
	...props
}: SearchBarProps) {
	const {
		value: currentValue,
		setValue,
		isPending,
	} = useControlledParam({
		key: prefix,
		value,
		onChange,
		debounce,
		type: "string",
		resetKeys,
	});

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setValue(e.target.value);
	};

	const handleClear = () => {
		setValue("");
	};

	return (
		<div className={cn("relative w-full", className)}>
			<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
			<Input
				{...props}
				className={cn("w-full pr-10 pl-10", inputClassName)}
				placeholder={placeholder || "Pesquisar..."}
				value={currentValue as string}
				onChange={handleInputChange}
			/>

			<div className="absolute top-1/2 right-4 flex -translate-y-1/2 flex-row items-center justify-end gap-2">
				{isPending ? (
					<Loader2 className="text-foreground h-4 w-4 origin-center animate-spin" />
				) : (currentValue as string) ? (
					<X
						className="text-foreground hover:text-foreground/80 h-4 w-4 cursor-pointer transition-colors"
						onClick={handleClear}
					/>
				) : null}
			</div>
		</div>
	);
}
