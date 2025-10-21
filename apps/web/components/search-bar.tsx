"use client";

import { cn } from "@/lib/utils";

// Icons
import { Search, Loader2, X } from "lucide-react";

// Components
import { Input } from "@/components/ui/input";

// Hooks
import { useControlledParam } from "@/hooks/use-controlled-param";

interface SearchBarProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
	prefix?: string;
	debounce?: number;
	// Client-Driven: forneça ambas para gerenciar estado no pai
	value?: string;
	onChange?: (value: string) => void;
}

export function SearchBar({
	prefix = "query",
	debounce = 500,
	value,
	onChange,
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
	});

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setValue(e.target.value);
	};

	const handleClear = () => {
		setValue("");
	};

	return (
		<div className="relative w-full">
			<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
			<Input
				className={cn("w-full pr-10 pl-10", props.className)}
				placeholder={props.placeholder || "Pesquisar..."}
				value={currentValue as string}
				onChange={handleInputChange}
				{...props}
			/>

			<div
				className={
					"absolute top-1/2 right-4 flex -translate-y-1/2 flex-row items-center justify-end gap-2"
				}
			>
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
