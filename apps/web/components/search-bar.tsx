"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

// Icons
import { Search, Loader2, X } from "lucide-react";

// Components
import { Input } from "@/components/ui/input";

// Hooks
import { useQueryString } from "@/hooks/use-query-string";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
	word?: string;
}

export function SearchBar({
	word = "query",
	onChange,
	...props
}: SearchBarProps) {
	const router = useRouter();
	const { query, toUrl } = useQueryString();

	const [isPending, startTransition] = useTransition();

	const [value, setValue] = useState(query.get(word) || "");
	const debouncedValue = useDebounce(value, 500);

	// Update URL only when debounced value changes
	useEffect(() => {
		startTransition(() => {
			router.push(
				toUrl(
					debouncedValue
						? { [word]: debouncedValue, page: undefined }
						: { [word]: undefined },
				),
				{
					scroll: false,
				},
			);
		});
	}, [debouncedValue, toUrl, router, word]);

	// Sync value with URL when component mounts or word changes
	useEffect(() => {
		const urlValue = query.get(word) || "";
		if (urlValue !== value) {
			setValue(urlValue);
		}
	}, [query, word]);

	const handleClear = () => {
		setValue("");
		startTransition(() => {
			router.push(toUrl({ [word]: undefined }), {
				scroll: false,
			});
		});
	};

	return (
		<div className="relative w-full">
			<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
			<Input
				className={cn("w-full pr-10 pl-10", props.className)}
				placeholder={props.placeholder || "Pesquisar..."}
				value={value}
				onChange={(e) => {
					if (onChange) onChange(e);
					setValue(e.target.value);
				}}
				{...props}
			/>

			<div
				className={
					"absolute top-1/2 right-4 flex -translate-y-1/2 flex-row items-center justify-end gap-2"
				}
			>
				{isPending ? (
					<Loader2 className="text-foreground h-4 w-4 origin-center animate-spin" />
				) : value ? (
					<X
						className="text-foreground hover:text-foreground/80 h-4 w-4 cursor-pointer transition-colors"
						onClick={handleClear}
					/>
				) : null}
			</div>
		</div>
	);
}
